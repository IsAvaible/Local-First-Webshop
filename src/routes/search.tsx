import { useCallback } from "react";
import {
  createFileRoute,
  stripSearchParams,
  useNavigate
} from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";

import Browse from "@/components/Browse.tsx";
import { getSearchPageData } from "@/server/functions/search.ts";
import {
  defaultValues,
  productSearchSchema,
  type ProductSearch
} from "@/shared/search.ts";

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
