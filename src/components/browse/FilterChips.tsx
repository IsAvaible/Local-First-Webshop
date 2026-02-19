import { Route, useSetSearch } from "@/routes/search.tsx";
import { Link } from "@tanstack/react-router";
import type { Category, Company, CustomFieldDefinition } from "@/db/schema.ts";
import { cn, humanizeCustomFieldLabel } from "@/lib/utils.ts";

export default function FilterChips({
  categories,
  companies,
  customFieldDefinitions,
  className
}: {
  categories: (Category & { count: number })[] | undefined;
  companies: (Company & { count: number })[] | undefined;
  customFieldDefinitions?: CustomFieldDefinition[] | undefined;
  className?: string | undefined;
}) {
  const filters: { name: string; value: string; clear: () => void }[] = [];
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

  // Custom fields
  const customFieldEntries = Object.entries(search.custom_fields ?? {}).filter(
    ([_, v]) => v !== undefined && v !== null
  );

  for (const [key, val] of customFieldEntries) {
    const def = customFieldDefinitions?.find((d) => d.field_name === key);
    const label = humanizeCustomFieldLabel(
      def?.field_name ?? key,
      val,
      def?.field_type
    );

    filters.push({
      name: def?.field_name ?? key,
      value: label,
      clear: () => {
        const prev = { ...(search.custom_fields ?? {}) };
        delete prev[key];
        setSearch({ custom_fields: prev });
      }
    });
  }

  if (filters.length === 0) return null;

  return (
    <div
      aria-label="Active filters"
      role="region"
      className="flex flex-wrap items-center gap-2"
    >
      <Link
        from={Route.fullPath}
        search={(prev) => ({ q: prev.q })}
        aria-label="Clear all active filters"
        className={cn(
          "rounded bg-gray-800 px-4 py-2 font-bold text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          className
        )}
      >
        Clear All
      </Link>

      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {filters.map((filter) => (
          <li key={filter.name}>
            <button
              type="button"
              onClick={filter.clear}
              aria-label={`Remove filter: ${filter.name} (${filter.value})`}
              className={cn(
                "group relative overflow-hidden rounded bg-gray-100 px-4 py-2 font-semibold hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                className
              )}
            >
              <span aria-hidden="true">{filter.value}</span>

              <span
                aria-hidden="true"
                className="absolute top-0 left-0 hidden h-full w-full items-center justify-center bg-inherit p-[inherit] group-hover:flex group-focus-visible:flex"
              >
                <span className="truncate">{filter.value}</span>
                <span className="ml-1 text-nowrap">✕</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
