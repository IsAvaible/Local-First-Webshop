import { useCallback } from "react";
import {
  createFileRoute,
  stripSearchParams,
  useNavigate
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  and,
  asc,
  desc,
  count,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  lte,
  or,
  type SQL
} from "drizzle-orm";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";

import {
  assetsTable,
  categoriesTable,
  companiesTable,
  customFieldDefinitionsTable,
  customFieldValuesTable,
  productsTable,
  type Category,
  type Company,
  type CustomFieldDefinition,
  type CustomFieldValue,
  type Product,
  type Asset
} from "@/db/schema.ts";
import { db } from "@/db/connection.ts";
import Browse from "@/components/Browse.tsx";

const defaultValues = {
  q: "",
  categories: [],
  companies: [],
  order: "popularity",
  dir: "desc" as const,
  custom_fields: {},
  limit: 24,
  offset: 0
};

const productSearchSchema = z.object({
  q: z.string().optional().catch(defaultValues.q),
  categories: z
    .array(z.number().int())
    .optional()
    .catch(defaultValues.categories),
  companies: z
    .array(z.number().int())
    .optional()
    .catch(defaultValues.companies),
  price_min: z.string().min(4).optional(),
  price_max: z.string().min(4).optional(),
  order: z.string().optional().catch(defaultValues.order),
  dir: z.enum(["asc", "desc"]).optional().catch(defaultValues.dir),
  custom_fields: z
    .record(z.string(), z.json().optional())
    .optional()
    .catch(defaultValues.custom_fields),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .catch(defaultValues.limit),
  offset: z.coerce.number().int().min(0).optional().catch(defaultValues.offset)
});

export type ProductSearch = z.infer<typeof productSearchSchema>;

type SearchRouteData = {
  products: (Product & { asset?: Asset })[];
  categories: (Category & { count: number })[];
  companies: (Company & { count: number })[];
  customFieldDefinitions: CustomFieldDefinition[];
  customFieldValues: CustomFieldValue[];
  hasNextPage: boolean;
  totalCount: number;
};

function buildBaseProductWhereClauses(search: ProductSearch): SQL[] {
  const whereClauses: SQL[] = [];

  if (search.q) {
    const queryWords = search.q
      .split(" ")
      .map((word) => word.trim())
      .filter(Boolean);

    for (const queryWord of queryWords) {
      whereClauses.push(
        or(
          ilike(productsTable.name, `%${queryWord}%`),
          ilike(productsTable.description, `%${queryWord}%`)
        )!
      );
    }
  }

  if (search.categories && search.categories.length > 0) {
    whereClauses.push(inArray(productsTable.category_id, search.categories));
  }

  if (search.companies && search.companies.length > 0) {
    whereClauses.push(inArray(productsTable.company_id, search.companies));
  }

  if (search.price_min !== undefined) {
    whereClauses.push(
      and(
        isNotNull(productsTable.base_price),
        gte(productsTable.base_price, search.price_min)
      )!
    );
  }

  if (search.price_max !== undefined) {
    whereClauses.push(
      and(
        isNotNull(productsTable.base_price),
        lte(productsTable.base_price, search.price_max)
      )!
    );
  }

  const customFieldFilters = Object.entries(search.custom_fields ?? {}).filter(
    ([, fieldValue]) => fieldValue !== undefined && fieldValue !== null
  );

  if (customFieldFilters.length > 0) {
    const filterConditions = customFieldFilters.map(
      ([fieldName, fieldValue]) =>
        and(
          eq(customFieldDefinitionsTable.field_name, fieldName),
          eq(customFieldValuesTable.value, fieldValue)
        )!
    );

    const matchingProductIdsSubquery = db
      .select({ product_id: customFieldValuesTable.product_id })
      .from(customFieldValuesTable)
      .innerJoin(
        customFieldDefinitionsTable,
        eq(
          customFieldValuesTable.field_definition_id,
          customFieldDefinitionsTable.id
        )
      )
      .where(or(...filterConditions))
      .groupBy(customFieldValuesTable.product_id)
      .having(eq(count(customFieldValuesTable.id), customFieldFilters.length));

    whereClauses.push(inArray(productsTable.id, matchingProductIdsSubquery));
  }

  return whereClauses;
}

// eslint-disable-next-line react-refresh/only-export-components
export const getSearchPageData = createServerFn({ method: "GET" })
  .inputValidator(productSearchSchema)
  .handler(async ({ data }): Promise<SearchRouteData> => {
    data.dir ??= defaultValues.dir;

    const customFieldDefinitions = await db
      .select()
      .from(customFieldDefinitionsTable)
      .orderBy(asc(customFieldDefinitionsTable.id));

    const mainWhereClauses = buildBaseProductWhereClauses(data);

    const [totalCountResult] = await db
      .select({ count: count() })
      .from(productsTable)
      .where(
        mainWhereClauses.length > 0 ? and(...mainWhereClauses) : undefined
      );
    const totalCount = totalCountResult.count;

    const customSortDefinition = customFieldDefinitions.find(
      (definition) => definition.field_name === data.order
    );

    let productsForView: Product[] = [];
    let productIds: number[] = [];
    const dirFunc = data.dir === "asc" ? asc : desc;

    // Fetch one extra item to check if there are more pages
    const queryLimit = (data.limit ?? defaultValues.limit) + 1;
    const queryOffset = data.offset ?? defaultValues.offset;

    if (customSortDefinition) {
      const rows = await db
        .select({ product: productsTable })
        .from(productsTable)
        // ... joins and where clauses remain the same
        .orderBy(
          dirFunc(customFieldValuesTable.value),
          dirFunc(productsTable.id)
        )
        .limit(queryLimit)
        .offset(queryOffset);

      productsForView = rows.map((r) => r.product);
    } else {
      const orderColName = data.order === "price" ? "base_price" : data.order;

      const orderCol =
        orderColName && orderColName in productsTable
          ? productsTable[orderColName as keyof typeof productsTable]
          : productsTable.id;

      const rows = await db
        .select({ product: productsTable })
        .from(productsTable)
        .where(
          mainWhereClauses.length > 0 ? and(...mainWhereClauses) : undefined
        )
        // @ts-expect-error - Custom search logic means we can't guarantee orderCol is a valid column, but we handle that case above
        .orderBy(dirFunc(orderCol), dirFunc(productsTable.id))
        .limit(queryLimit)
        .offset(queryOffset);

      productsForView = rows.map((r) => r.product);
    }

    // Determine if there is a next page, then slice off the extra item
    const hasNextPage = productsForView.length === queryLimit;
    if (hasNextPage) {
      productsForView.pop();
    }

    productIds = productsForView.map((p) => p.id);

    const customFieldValues = (
      productIds.length > 0
        ? await db
            .select()
            .from(customFieldValuesTable)
            .where(inArray(customFieldValuesTable.product_id, productIds))
        : []
    ) as CustomFieldValue[];

    const firstAssetByProductId = new Map<number, Asset>();

    if (productIds.length > 0) {
      const assetRows = await db
        .select()
        .from(assetsTable)
        .where(inArray(assetsTable.product_id, productIds))
        .orderBy(asc(assetsTable.id));

      for (const asset of assetRows) {
        if (!firstAssetByProductId.has(asset.product_id)) {
          firstAssetByProductId.set(asset.product_id, asset);
        }
      }
    }

    const categoryFacetSearch: ProductSearch = { ...data, categories: [] };
    const categoryWhereClauses =
      buildBaseProductWhereClauses(categoryFacetSearch);
    const categoryCountsRows = await db
      .select({
        id: productsTable.category_id,
        count: count(productsTable.id)
      })
      .from(productsTable)
      .where(
        categoryWhereClauses.length > 0
          ? and(...categoryWhereClauses)
          : undefined
      )
      .groupBy(productsTable.category_id);
    const categoryCountById = new Map(
      categoryCountsRows.map((r) => [r.id, Number(r.count)])
    );

    const companyFacetSearch: ProductSearch = { ...data, companies: [] };
    const companyWhereClauses =
      buildBaseProductWhereClauses(companyFacetSearch);
    const companyCountsRows = await db
      .select({
        id: productsTable.company_id,
        count: count(productsTable.id)
      })
      .from(productsTable)
      .where(
        companyWhereClauses.length > 0 ? and(...companyWhereClauses) : undefined
      )
      .groupBy(productsTable.company_id);
    const companyCountById = new Map(
      companyCountsRows.map((r) => [r.id, Number(r.count)])
    );

    const categories = await db
      .select()
      .from(categoriesTable)
      .orderBy(asc(categoriesTable.id));

    const companies = (await db
      .select()
      .from(companiesTable)
      .orderBy(asc(companiesTable.id))) as Company[];

    return {
      products: productsForView.map((product) => ({
        ...product,
        asset: firstAssetByProductId.get(product.id)
      })),
      customFieldDefinitions,
      customFieldValues,
      categories: categories.map((category) => ({
        ...category,
        count: categoryCountById.get(category.id) ?? 0
      })),
      companies: companies.map((company) => ({
        ...company,
        count: companyCountById.get(company.id) ?? 0
      })),
      hasNextPage,
      totalCount
    };
  });

export const Route = createFileRoute("/search")({
  ssr: true,
  validateSearch: zodValidator(productSearchSchema),
  component: RouteComponent,
  search: {
    middlewares: [stripSearchParams({ ...defaultValues, dir: undefined })]
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => getSearchPageData({ data: deps })
});

function RouteComponent() {
  const {
    products,
    categories,
    companies,
    customFieldDefinitions,
    customFieldValues,
    hasNextPage,
    totalCount
  } = Route.useLoaderData();

  return (
    <Browse
      loading={false}
      products={products}
      categories={categories}
      companies={companies}
      customFieldDefinitions={customFieldDefinitions}
      customFieldValues={customFieldValues}
      currentSearch={Route.useSearch()}
      hasNextPage={hasNextPage}
      totalCount={totalCount}
    />
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSetSearch = () => {
  const navigate = useNavigate({ from: Route.fullPath });

  return useCallback(
    (newSearch: Partial<ProductSearch>) => {
      void navigate({
        search: (previousSearch) => ({
          ...previousSearch,
          ...newSearch
        }),
        replace: true
      });
    },
    [navigate]
  );
};
