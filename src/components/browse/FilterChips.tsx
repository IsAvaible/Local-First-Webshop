import { Route, useSetSearch } from "@/routes/search.tsx";
import { Link } from "@tanstack/react-router";

export default function FilterChips() {
  const filters = [];
  const search = Route.useSearch();
  const setSearch = useSetSearch();

  if (search.price_min !== undefined || search.price_max !== undefined) {
    filters.push({
      name: "Price",
      value: `${search.price_min ?? "min"} - ${search.price_max ?? "max"}`,
      clear: () => setSearch({ price_min: undefined, price_max: undefined })
    });
  }

  if (search.categories?.length) {
    filters.push({
      name: "Categories",
      value: `Categories: ${search.categories.length}`,
      clear: () => setSearch({ categories: [] })
    });
  }

  if (search.companies?.length) {
    filters.push({
      name: "Companies",
      value: `Companies: ${search.companies.length}`,
      clear: () => setSearch({ companies: [] })
    });
  }

  return (
    <>
      {filters.length > 0 && (
        <Link
          from={Route.fullPath}
          search={(prev) => ({ q: prev.q })}
          className="rounded bg-gray-800 px-4 py-2 font-bold text-white"
        >
          Clear All
        </Link>
      )}

      {filters.map((filter) => (
        <button
          type="button"
          key={filter.name}
          onClick={filter.clear}
          title={`Clear ${filter.name} Filter`}
          className="group relative overflow-hidden rounded bg-gray-100 px-4 py-2 font-semibold hover:bg-gray-200"
        >
          <span>{filter.value}</span>
          <span className="absolute top-0 left-0 hidden h-full w-full items-center justify-center bg-inherit p-[inherit] group-hover:flex">
            <span className="truncate">{filter.value}</span>
            <span className="ml-1 text-nowrap">X</span>
          </span>
        </button>
      ))}
    </>
  );
}
