import { Route, useSetSearch } from "@/routes/search.tsx";
import { Link } from "@tanstack/react-router";
import type { Category, Company } from "@/db/schema.ts";

export default function FilterChips({
  categories,
  companies
}: {
  categories: (Category & { count: number })[] | undefined;
  companies: (Company & { count: number })[] | undefined;
}) {
  const filters = [];
  const search = Route.useSearch();
  const setSearch = useSetSearch();

  const { price_min, price_max } = search;

  if (price_min !== undefined || price_max !== undefined) {
    const f = new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    });

    const minFormatted =
      price_min !== undefined ? f.format(price_min) : undefined;
    const maxFormatted =
      price_max !== undefined ? f.format(price_max) : undefined;

    let value = "";

    if (minFormatted && maxFormatted) {
      value = `${minFormatted} – ${maxFormatted}`;
    } else if (minFormatted) {
      value = `From ${minFormatted}`;
    } else if (maxFormatted) {
      value = `Up to ${maxFormatted}`;
    }

    filters.push({
      name: "Price",
      value: value,
      clear: () => setSearch({ price_min: undefined, price_max: undefined })
    });
  }

  if (search.categories?.length) {
    const count = search.categories.length;
    let value: string;

    if (count === 1) {
      const categoryId = search.categories[0];
      // Find the full category object from props to get its name
      const category = categories?.find((c) => c.id === categoryId);
      // Use the name, or fallback to the ID if not found
      value = `Category: ${category?.name ?? categoryId}`;
    } else {
      value = `Categories: ${count}`;
    }

    filters.push({
      name: "Categories",
      value: value,
      clear: () => setSearch({ categories: [] })
    });
  }

  if (search.companies?.length) {
    const count = search.companies.length;
    let value: string;

    if (count === 1) {
      const companyId = search.companies[0];
      // Find the full company object from props to get its name
      const company = companies?.find((c) => c.id === companyId);
      // Use the name, or fallback to the ID if not found
      value = `Company: ${company?.name ?? companyId}`;
    } else {
      value = `Companies: ${count}`;
    }

    filters.push({
      name: "Companies",
      value: value,
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
            <span className="ml-1 cursor-pointer text-nowrap">X</span>
          </span>
        </button>
      ))}
    </>
  );
}
