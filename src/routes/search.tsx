import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  isUndefined
} from "@tanstack/react-db";

import {
  productsCollection,
  pricingTiersCollection,
  customFieldValuesCollection,
  customFieldDefinitionsCollection
} from "@/lib/collections.ts";
import type { Product } from "@/db/schema.ts";
import Browse from "@/components/Browse.tsx";

// --- 1. Zod Schema for Search Param Validation ---
// This schema defines the "state" of our search page.
// .catch() provides default values for missing and invalid params.
const productSearchSchema = z.object({
  // Free text search
  q: z.string().optional().catch(""),
  // Filters
  categories: z.array(z.number().int()).optional().catch([]),
  companies: z.array(z.number().int()).optional().catch([]),
  // Price Range
  price_min: z.coerce.number().min(0).optional(),
  price_max: z.coerce.number().min(0).optional(),
  // Sorting
  order: z.string().optional().catch("price"),
  dir: z.enum(["asc", "desc"]).optional().catch("desc"),
  // Advanced Filters (expects a JSON object from URL)
  custom_fields: z.record(z.string(), z.any()).optional().catch({})
});

type ProductSearch = z.infer<typeof productSearchSchema>;

// --- 2. Route Definition ---
export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(productSearchSchema),

  component: ProductsComponent
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
  if (categories) {
    base_query = base_query.where(({ p }) => {
      return inArray(p.category_id, categories);
    });
  }

  // --- Company Filter ---
  if (companies) {
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

  // LEFT JOIN our main query to the minimum price subquery
  let price_query = base_query.leftJoin(
    { price: minPriceSubquery },
    ({ p, price }) => eq(p.id, price.product_id)
  );

  // Add price conditions (must check for undefined/null from LEFT JOIN)
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
        and(
          eq(cfd.field_name, fieldName),
          eq(cfv.value, fieldValue) // `value` is jsonb, `eq` works
        )
      )
      .select(({ cfv }) => ({ product_id: cfv.product_id }))
      .distinct();

    // INNER JOIN the main query with this subquery of matching IDs
    // This ensures the product matches *all* specified custom fields
    property_query = price_query.innerJoin(
      { [alias]: matchingProductIdsSubquery },
      ({ p, [alias]: cfAlias }) => eq(p.id, cfAlias.product_id)
    );
  });

  return property_query;
}

// --- 4. Route Component ---
function ProductsComponent() {
  // Get the validated search params from the route
  const search = Route.useSearch();
  const { order, dir } = search;
  const navigate = useNavigate({ from: Route.fullPath });

  // --- Data Query: Get the products for the current page ---
  const productsLiveQuery = useLiveQuery(() => {
    // 1. Get the base filtered query
    let query = getFilteredProductsQuery(search);

    // 2. Apply Sorting
    query.orderBy(({ p }) => {
      return [p[order as keyof Product], dir];
    });

    // 3. Apply Final Select
    query = query.select(({ p, price }) => ({
      ...p,
      min_price: price?.min_price
    }));

    return query;
  }, [search]);

  // --- Count Query: Get the total number of matching products ---
  // const countLiveQuery = useLiveQuery(() => {
  //   // 1. Get the exact same base filtered query
  //   let query = getFilteredProductsQuery(search);
  //
  //   // 2. Apply Count Aggregation
  //   query = query.select(({ p }) => ({ total: count(p.id) }));
  //
  //   return query;
  // }, [search]);

  const { data: products, isLoading } = productsLiveQuery;

  // Helper for navigation
  const setSearch = (newSearch: Partial<ProductSearch>) => {
    void navigate({
      search: (prev) => ({ ...prev, ...newSearch }),
      replace: true
    });
  };

  return (
    <Browse loading={isLoading} products={products} setSearch={setSearch} />
  );
}
