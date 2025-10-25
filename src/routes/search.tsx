import { useCallback } from "react";
import {
  createFileRoute,
  stripSearchParams,
  useNavigate
} from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import {
  useLiveQuery,
  Query,
  eq,
  and,
  or,
  ilike,
  inArray,
  gte,
  lte,
  min,
  not,
  isUndefined,
  count
} from "@tanstack/react-db";

import {
  assetsCollection,
  categoriesCollection,
  companiesCollection,
  customFieldDefinitionsCollection,
  customFieldValuesCollection,
  pricingTiersCollection,
  productsCollection
} from "@/lib/collections.ts";
import type { Asset, CustomFieldValue, Product } from "@/db/schema.ts";
import Browse from "@/components/Browse.tsx";

const defaultValues = {
  q: "",
  categories: [],
  companies: [],
  order: "popularity",
  dir: "desc" as const,
  custom_fields: {}
};

// --- 1. Zod Schema for Search Param Validation ---

/**
 * Defines the shape and default values for our URL search parameters.
 * This schema validates and provides fallbacks for all search state.
 */
const productSearchSchema = z.object({
  // Free text search
  q: z.string().optional().catch(defaultValues.q),
  // Filters
  categories: z
    .array(z.number().int())
    .optional()
    .catch(defaultValues.categories),
  companies: z
    .array(z.number().int())
    .optional()
    .catch(defaultValues.companies),
  // Price Range
  price_min: z.coerce.number().min(0).optional(),
  price_max: z.coerce.number().min(0).optional(),
  // Sorting
  order: z.string().optional().catch(defaultValues.order),
  dir: z.enum(["asc", "desc"]).optional().catch(defaultValues.dir),
  // Advanced Filters (expects a JSON object string from URL)
  custom_fields: z
    .record(z.string(), z.json().optional())
    .optional()
    .catch(defaultValues.custom_fields)
});

export type ProductSearch = z.infer<typeof productSearchSchema>;

// --- 2. Route Definition ---

export const Route = createFileRoute("/search")({
  // Validate URL search params against our Zod schema
  validateSearch: zodValidator(productSearchSchema),
  component: RouteComponent,
  // Clean up URL by removing params that match defaults (except 'dir')
  search: {
    middlewares: [stripSearchParams({ ...defaultValues, dir: undefined })]
  },
  // Preload all necessary data collections when the route loads
  loader: async () => {
    await Promise.all([
      productsCollection.preload(),
      pricingTiersCollection.preload(),
      customFieldValuesCollection.preload(),
      customFieldDefinitionsCollection.preload(),
      categoriesCollection.preload(),
      companiesCollection.preload()
    ]);
    return null;
  }
});

// --- 3. Reusable Query Builder Function ---

/**
 * Builds a base TanStack DB query for products based on search parameters.
 *
 * This function constructs a single, complex query that applies all
 * filters (text, category, company, price, and custom fields).
 *
 * It also joins a minimum price and a primary asset for data enrichment.
 *
 * @param search - The validated search parameters object.
 * @returns A TanStack DB Query instance, ready for `select` or `orderBy`.
 */
function buildFilteredProductQuery(search: ProductSearch) {
  const { q, categories, companies, price_min, price_max, custom_fields } =
    search;

  let query = new Query().from({ p: productsCollection });

  // --- Text Search ---
  if (q) {
    const queryWords = q.split(" ").filter(Boolean);
    for (const word of queryWords) {
      query = query.where(({ p }) => {
        return or(
          ilike(p.name, `%${word}%`),
          ilike(p.description, `%${word}%`)
        );
      });
    }
  }

  // --- Category Filter ---
  if (categories && categories.length > 0) {
    query = query.where(({ p }) => {
      return inArray(p.category_id, categories);
    });
  }

  // --- Company Filter ---
  if (companies && companies.length > 0) {
    query = query.where(({ p }) => {
      return inArray(p.company_id, companies);
    });
  }

  // --- Price Filter (via Subquery) ---
  // 1. Create a subquery to find the minimum price for each product.
  const minPriceSubquery = new Query()
    .from({ pt: pricingTiersCollection })
    .groupBy(({ pt }) => pt.product_id)
    .select(({ pt }) => ({
      product_id: pt.product_id,
      min_price: min(pt.price_per_unit)
    }));

  // 2. Join the minimum price onto the main query.
  let queryWithPrice = query.leftJoin(
    { price: minPriceSubquery },
    ({ p, price }) => eq(p.id, price.product_id)
  );

  // 3. Apply price range filters (if they exist).
  if (price_min !== undefined) {
    queryWithPrice = queryWithPrice.where(({ price }) => {
      // Must check for undefined price (for products with no tiers)
      return and(not(isUndefined(price)), gte(price!.min_price, price_min));
    });
  }
  if (price_max !== undefined) {
    queryWithPrice = queryWithPrice.where(({ price }) => {
      return and(not(isUndefined(price)), lte(price!.min_price, price_max));
    });
  }

  // --- Custom Fields Filter (Dynamic Subquery) ---
  const customFieldFilters = Object.entries(custom_fields ?? {}).filter(
    ([_, v]) => v !== undefined && v !== null
  );

  let queryWithPriceFiltered = queryWithPrice;
  if (customFieldFilters.length > 0) {
    // 1. Create a subquery to find product IDs that match ALL filters.
    const matchingProductIdsSubquery = new Query()
      .from({ cfv: customFieldValuesCollection })
      .innerJoin({ cfd: customFieldDefinitionsCollection }, ({ cfv, cfd }) =>
        eq(cfv.field_definition_id, cfd.id)
      )
      .where(({ cfd, cfv }) => {
        // Create an OR list of all filter conditions:
        // (name = 'field1' AND value = 'value1') OR (name = 'field2' AND value = 'value2')
        const filterConditions = customFieldFilters.map(
          ([fieldName, fieldValue]) =>
            and(eq(cfd.field_name, fieldName), eq(cfv.value, fieldValue))
        );

        return filterConditions.reduce((acc, condition) => or(acc, condition));
      })
      .groupBy(({ cfv }) => cfv.product_id)
      // 2. Use HAVING to ensure the product matches ALL filters, not just one.
      .having(({ cfv }) => eq(count(cfv.id), customFieldFilters.length))
      .select(({ cfv }) => ({
        product_id: cfv.product_id,
        match_count: count(cfv.id)
      }));

    // 3. Join these matching IDs with the main query.
    queryWithPriceFiltered = queryWithPrice.innerJoin(
      { cf_matches: matchingProductIdsSubquery },
      ({ p, cf_matches }) => eq(p.id, cf_matches.product_id)
    );
  }

  // --- Asset/Image Join (for display) ---
  // 1. Subquery to find the ID of the "first" asset (e.g., primary image).
  const firstAssetIdSubquery = new Query()
    .from({ a: assetsCollection })
    .groupBy(({ a }) => a.product_id)
    .select(({ a }) => ({
      product_id: a.product_id,
      first_asset_id: min(a.id)
    }));

  // 2. Join the asset ID, then join the asset data itself.
  return queryWithPriceFiltered
    .leftJoin({ fa_id: firstAssetIdSubquery }, ({ p, fa_id }) =>
      eq(p.id, fa_id.product_id)
    )
    .leftJoin({ asset: assetsCollection }, ({ asset, fa_id }) =>
      eq(asset.id, fa_id?.first_asset_id)
    );
}

// --- 4. Route Component ---

/**
 * Renders the search page, orchestraing all data fetching
 * for products, filters, and facet counts.
 */
function RouteComponent() {
  const search = Route.useSearch();

  // 1. Fetch all custom field *definitions* (e.g., "Color", "Size")
  // Used for building the filter UI and for client-side sorting logic.
  const { data: customFieldDefinitions } = useLiveQuery((q) =>
    q.from({ cfd: customFieldDefinitionsCollection })
  );

  // 2. Fetch the filtered list of products
  const { data: products, isLoading } = useLiveQuery(() => {
    let query = buildFilteredProductQuery(search);

    // Check if sorting by a custom field.
    // If so, skip server-side sort (it will be handled on the client).
    const isCustomFieldSort = customFieldDefinitions?.some(
      (cfd) => cfd.field_name === search.order
    );

    if (!isCustomFieldSort) {
      query = query.orderBy(({ p, price }) => {
        const orderKey =
          search.order === "price"
            ? price?.min_price
            : p[search.order as keyof Product];
        return [orderKey, search.dir];
      }, search.dir ?? defaultValues.dir);
    }

    // Select the final data shape for the component
    return query.select(({ p, price, asset }) => ({
      ...p,
      min_price: price?.min_price,
      asset: asset
    }));
  }, [search, customFieldDefinitions]);

  // 3. Fetch custom field values for the currently returned products so the UI
  // can show/filter/sort by custom properties on the client-side.
  const { data: customFieldValues } = useLiveQuery((q) =>
    q
      .from({ cfv: customFieldValuesCollection })
      .innerJoin({ p: productsCollection }, ({ cfv, p }) =>
        eq(cfv.product_id, p.id)
      )
      .select(({ cfv }) => ({ ...cfv }))
  );

  const typedProducts = products as
    | (Product & { min_price: number | null; asset?: Asset })[]
    | undefined;

  // 4. Fetch Facet Counts (Categories)
  const { categories: _c, ...categoryCountSearch } = search;
  const { data: categoryCounts } = useLiveQuery(() => {
    return buildFilteredProductQuery(categoryCountSearch)
      .groupBy(({ p }) => p.category_id)
      .select(({ p }) => ({
        id: p.category_id,
        count: count(p.id)
      }));
  }, [search]);

  // 5. Fetch Facet Counts (Companies)
  const { companies: _co, ...companyCountSearch } = search;
  const { data: companyCounts } = useLiveQuery(() => {
    return buildFilteredProductQuery(companyCountSearch)
      .groupBy(({ p }) => p.company_id)
      .select(({ p }) => ({
        id: p.company_id,
        count: count(p.id)
      }));
  }, [search]);

  // 6. Fetch category/company definitions (names, etc.)
  const { data: categoriesFromDb } = useLiveQuery((q) =>
    q.from({ categoriesCollection })
  );
  const { data: companiesFromDb } = useLiveQuery((q) =>
    q.from({ companiesCollection })
  );

  // 7. Merge definitions with live counts for the UI
  const categories = categoriesFromDb?.map((category) => ({
    ...category,
    count: categoryCounts?.find((c) => c.id === category.id)?.count ?? 0
  }));

  const companies = companiesFromDb?.map((company) => ({
    ...company,
    count: companyCounts?.find((c) => c.id === company.id)?.count ?? 0
  }));

  // 8. Render the Browse component with all fetched data
  return (
    <Browse
      loading={isLoading}
      products={typedProducts}
      categories={categories}
      companies={companies}
      customFieldDefinitions={customFieldDefinitions}
      customFieldValues={customFieldValues as CustomFieldValue[] | undefined}
    />
  );
}

// --- 5. Helper Hook ---
/**
 * A custom hook that provides a type-safe function to update
 * the URL search parameters for the current route.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useSetSearch = () => {
  const navigate = useNavigate({ from: Route.fullPath });

  return useCallback(
    (newSearch: Partial<ProductSearch>) => {
      void navigate({
        search: (prev) => ({
          ...prev,
          ...newSearch
        }),
        replace: true
      });
    },
    [navigate]
  );
};
