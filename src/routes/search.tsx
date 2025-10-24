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
  productsCollection,
  pricingTiersCollection,
  customFieldValuesCollection,
  customFieldDefinitionsCollection,
  categoriesCollection,
  companiesCollection
} from "@/lib/collections.ts";
import type { Product } from "@/db/schema.ts";
import type { CustomFieldValue } from "@/db/schema.ts";
import Browse from "@/components/Browse.tsx";
import { useCallback } from "react";

const defaultValues = {
  q: "",
  categories: [],
  companies: [],
  order: "price",
  dir: "desc" as const,
  custom_fields: {}
};

// --- 1. Zod Schema for Search Param Validation ---
// This schema defines the "state" of our search page.
// .catch() provides default values for missing and invalid params.
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
  // Advanced Filters (expects a JSON object from URL)
  custom_fields: z
    .record(z.string(), z.json().optional())
    .optional()
    .catch(defaultValues.custom_fields)
});

export type ProductSearch = z.infer<typeof productSearchSchema>;

// --- 2. Route Definition ---
export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(productSearchSchema),
  component: RouteComponent,
  search: {
    middlewares: [stripSearchParams(defaultValues)]
  },
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
 * Creates a base TanStack DB query for products, applying all filters
 * from the search parameters. Does NOT apply sorting or pagination.
 */
function getFilteredProductsQuery(search: ProductSearch) {
  const { q, categories, companies, price_min, price_max, custom_fields } =
    search;

  let base_query = new Query().from({ p: productsCollection });

  // --- Text Search ---
  if (q) {
    const queryWords = q.split(" ").filter(Boolean);
    for (const word of queryWords) {
      base_query = base_query.where(({ p }) => {
        return or(
          ilike(p.name, `%${word}%`),
          ilike(p.description, `%${word}%`)
        );
      });
    }
  }

  // --- Category Filter ---
  if (categories && categories.length > 0) {
    base_query = base_query.where(({ p }) => {
      return inArray(p.category_id, categories);
    });
  }

  // --- Company Filter ---
  if (companies && companies.length > 0) {
    base_query = base_query.where(({ p }) => {
      return inArray(p.company_id, companies);
    });
  }

  // --- Price Filter (via Subquery) ---
  // Subquery to find the minimum price for each product
  const minPriceSubquery = new Query()
    .from({ pt: pricingTiersCollection })
    .groupBy(({ pt }) => pt.product_id)
    .select(({ pt }) => ({
      product_id: pt.product_id,
      min_price: min(pt.price_per_unit)
    }));

  let price_query = base_query.leftJoin(
    { price: minPriceSubquery },
    ({ p, price }) => eq(p.id, price.product_id)
  );

  if (price_min !== undefined) {
    price_query = price_query.where(({ price }) => {
      return and(not(isUndefined(price)), gte(price!.min_price, price_min));
    });
  }
  if (price_max !== undefined) {
    price_query = price_query.where(({ price }) => {
      return and(not(isUndefined(price)), lte(price!.min_price, price_max));
    });
  }

  // --- Custom Fields Filter (Dynamic Joins) ---
  const customFieldEntries = Object.entries(custom_fields ?? {}).filter(
    ([_, v]) => v !== undefined && v !== null
  );

  let property_query = price_query;
  customFieldEntries.forEach(([fieldName, fieldValue], index) => {
    const alias = `cf_${index}`;

    // Subquery to find product IDs matching this specific custom field
    const matchingProductIdsSubquery = new Query()
      .from({ cfv: customFieldValuesCollection })
      .innerJoin({ cfd: customFieldDefinitionsCollection }, ({ cfv, cfd }) =>
        eq(cfv.field_definition_id, cfd.id)
      )
      .where(({ cfd, cfv }) =>
        and(eq(cfd.field_name, fieldName), eq(cfv.value, fieldValue))
      )
      .select(({ cfv }) => ({ product_id: cfv.product_id }))
      .distinct();

    property_query = price_query.innerJoin(
      { [alias]: matchingProductIdsSubquery },
      ({ p, [alias]: cfAlias }) => eq(p.id, cfAlias.product_id)
    );
  });

  return property_query;
}

// --- 4. Route Component ---
function RouteComponent() {
  const search = Route.useSearch();

  const { data: customFieldDefinitions } = useLiveQuery((q) =>
    q.from({ cfd: customFieldDefinitionsCollection })
  );

  const { data: products, isLoading } = useLiveQuery(() => {
    let query = getFilteredProductsQuery(search);

    // Only apply server-side ordering for product properties and price.
    // Custom-field ordering is handled client-side in the Browse component.
    const isCustomOrder = customFieldDefinitions?.some(
      (cfd) => cfd.field_name === search.order
    );

    if (!isCustomOrder) {
      query = query.orderBy(({ p, price }) => {
        const orderKey =
          search.order === "price"
            ? price?.min_price
            : p[search.order as keyof Product];
        return [orderKey, search.dir];
      });
    }

    return query.select(({ p, price }) => ({
      ...p,
      min_price: price?.min_price
    }));
  }, [search, customFieldDefinitions]);

  // Fetch custom field values for the currently returned products so the UI
  // can show/filter/sort by custom properties on the client-side.
  const { data: customFieldValues } = useLiveQuery((q) =>
    q
      .from({ cfv: customFieldValuesCollection })
      .innerJoin({ p: productsCollection }, ({ cfv, p }) =>
        eq(cfv.product_id, p.id)
      )
      .select(({ cfv }) => ({ ...cfv }))
  );

  // Normalize min_price to number | null for component consumers
  type RawProductWithMinPrice = Product & {
    min_price: number | null;
  };

  const normalizedProducts = (
    products as RawProductWithMinPrice[] | undefined
  )?.map((p) => ({
    ...p,
    min_price: p.min_price == null ? null : Number(p.min_price)
  }));

  const typedProducts = normalizedProducts as
    | (Product & { min_price: number | null })[]
    | undefined;

  // --- Category Counts ---
  const { categories: _c, ...searchForCategoryCounts } = search;
  const { data: categoryCounts } = useLiveQuery(() => {
    return getFilteredProductsQuery(searchForCategoryCounts)
      .groupBy(({ p }) => p.category_id)
      .select(({ p }) => ({
        id: p.category_id,
        count: count(p.id)
      }));
  }, [search]);

  // --- Company Counts ---
  const { companies: _co, ...searchForCompanyCounts } = search;
  const { data: companyCounts } = useLiveQuery(() => {
    return getFilteredProductsQuery(searchForCompanyCounts)
      .groupBy(({ p }) => p.company_id)
      .select(({ p }) => ({
        id: p.company_id,
        count: count(p.id)
      }));
  }, [search]);

  const { data: categoriesFromDb } = useLiveQuery((q) =>
    q.from({ categoriesCollection })
  );
  const { data: companiesFromDb } = useLiveQuery((q) =>
    q.from({ companiesCollection })
  );

  const categories = categoriesFromDb?.map((category) => ({
    ...category,
    count: categoryCounts?.find((c) => c.id === category.id)?.count ?? 0
  }));

  const companies = companiesFromDb?.map((company) => ({
    ...company,
    count: companyCounts?.find((c) => c.id === company.id)?.count ?? 0
  }));

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

/**
 * A custom hook that provides a function to update
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
