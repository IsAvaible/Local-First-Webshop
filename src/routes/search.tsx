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
  productsCollection
} from "@/lib/collections.ts";
import type { Product } from "@/db/schema.ts";
import Browse from "@/components/Browse.tsx";
import Big from "big.js";

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
  ssr: false,
  // Validate URL search params against our Zod schema
  validateSearch: zodValidator(productSearchSchema),
  component: RouteComponent,
  // Clean up URL by removing params that match defaults (except 'dir')
  search: {
    middlewares: [stripSearchParams({ ...defaultValues, dir: undefined })]
  },
  // Preload all necessary data collections when the route loads
  loader: () => {
    void Promise.all([
      productsCollection.preload(),
      customFieldValuesCollection.preload(),
      customFieldDefinitionsCollection.preload(),
      categoriesCollection.preload(),
      companiesCollection.preload(),
      assetsCollection.preload()
    ]);
    return null;
  }
});

// --- 3. Reusable Query Builder Functions ---

/**
 * Builds a base TanStack DB query for products based on search parameters.
 *
 * This function constructs a single, complex query that applies all
 * filters (text, category, company, price, and custom fields)
 *
 * @param search - The validated search parameters object.
 * @returns A TanStack DB Query instance, ready for `select` or `orderBy`.
 */
function buildBaseFilterQuery(search: ProductSearch) {
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
  if (price_min !== undefined) {
    query = query.where(({ p }) => {
      return and(
        not(isUndefined(p.base_price)),
        gte(p.base_price, new Big(price_min).toFixed(2))
      );
    });
  }
  if (price_max !== undefined) {
    query = query.where(({ p }) => {
      return and(
        not(isUndefined(p.base_price)),
        lte(p.base_price, new Big(price_max).toFixed(2))
      );
    });
  }

  // --- Custom Fields Filter (Dynamic Subquery) ---
  const customFieldFilters = Object.entries(custom_fields ?? {}).filter(
    ([_, v]) => v !== undefined && v !== null
  );

  let queryWithPriceFiltered = query;
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
    queryWithPriceFiltered = query.innerJoin(
      { cf_matches: matchingProductIdsSubquery },
      ({ p, cf_matches }) => eq(p.id, cf_matches.product_id)
    );
  }

  return queryWithPriceFiltered;
}

/**
 * Extends the base query with expensive display joins (like assets).
 */
function buildFilteredProductQuery(search: ProductSearch) {
  const baseQuery = buildBaseFilterQuery(search);

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
  return baseQuery
    .leftJoin({ fa_id: firstAssetIdSubquery }, ({ p, fa_id }) =>
      eq(p.id, fa_id.product_id)
    )
    .leftJoin({ asset: assetsCollection }, ({ asset, fa_id }) =>
      eq(asset.id, fa_id?.first_asset_id)
    );
}

// --- 4. Route Component ---

/**
 * Renders the search page, orchestrating all data fetching
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
    const isCustomFieldSort = customFieldDefinitions?.some(
      (cfd) => cfd.field_name === search.order
    );

    if (isCustomFieldSort) {
      // Build a subquery that selects the value for the chosen field per product.
      // We select a single value per (product, field) pair. If a product doesn't
      // have a value for that field, the leftJoin will leave sort_value undefined.
      const sortValueSubquery = new Query()
        .from({ cfv: customFieldValuesCollection })
        .innerJoin({ cfd: customFieldDefinitionsCollection }, ({ cfv, cfd }) =>
          eq(cfv.field_definition_id, cfd.id)
        )
        .where(({ cfd }) => eq(cfd.field_name, search.order))
        .select(({ cfv }) => ({
          product_id: cfv.product_id,
          sort_value: cfv.value
        }));

      const query_with_sort = query.leftJoin(
        { sort_val: sortValueSubquery },
        ({ p, sort_val }) => eq(p.id, sort_val.product_id)
      );

      // Order by the custom field value (if present). Fall back to id
      query = query_with_sort
        .orderBy(({ sort_val }) => sort_val?.sort_value, {
          direction: search.dir,
          nulls: "last"
        })
        .orderBy(({ p }) => p.id, search.dir);
    } else {
      query = query.orderBy(({ p }) => {
        const orderKey =
          search.order === "price"
            ? p.base_price
            : p[search.order as keyof Product];
        return [orderKey, search.dir];
      }, search.dir ?? defaultValues.dir);
    }

    // Select the final data shape for the component
    return query.select(({ p, asset }) => ({
      ...p,
      asset: asset
    }));
  }, [search, customFieldDefinitions]);

  // 3. Fetch custom field values for the currently returned products
  const { data: customFieldValues } = useLiveQuery(() => {
    const filteredProductsQuery = buildBaseFilterQuery(search);

    return new Query()
      .from({ cfv: customFieldValuesCollection })
      .innerJoin({ p: filteredProductsQuery }, ({ cfv, p }) =>
        eq(cfv.product_id, p.id)
      )
      .select(({ cfv }) => ({ ...cfv }));
  }, [search]);

  // 4. Fetch Facet Counts (Categories)
  const { categories: _c, ...categoryCountSearch } = search;
  const { data: categoryCounts } = useLiveQuery(() => {
    return buildBaseFilterQuery(categoryCountSearch)
      .groupBy(({ p }) => p.category_id)
      .select(({ p }) => ({
        id: p.category_id,
        count: count(p.id)
      }));
  }, [search]);

  // 5. Fetch Facet Counts (Companies)
  const { companies: _co, ...companyCountSearch } = search;
  const { data: companyCounts } = useLiveQuery(() => {
    return buildBaseFilterQuery(companyCountSearch)
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
      products={products}
      categories={categories}
      companies={companies}
      customFieldDefinitions={customFieldDefinitions}
      customFieldValues={customFieldValues}
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
