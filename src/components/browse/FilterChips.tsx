export interface Filter {
  name: string;
  value: string;
  clear: () => void;
}

interface FilterChipsProps {
  filters: Filter[];
  clearAll?: () => void;
}

export default function FilterChips({ filters, clearAll }: FilterChipsProps) {
  return (
    // Use a fragment to group the buttons
    <>
      {/* Conditionally render the "Clear All" button */}
      {filters.length > 0 && (
        <button
          onClick={clearAll}
          className="rounded bg-gray-800 px-4 py-2 font-bold text-white"
        >
          Clear All
        </button>
      )}

      {/* Map over the filters array to render each filter button */}
      {filters.map((filter) => (
        <button
          type="button"
          key={filter.name}
          onClick={filter.clear}
          // The complex v-tooltip is replaced with a standard title attribute.
          // For custom tooltips, you would use a library like 'react-tooltip'.
          title={`Clear ${filter.name} Filter`}
          className="group relative overflow-hidden rounded bg-gray-100 px-4 py-2 font-semibold hover:bg-gray-200"
        >
          {/* Default view */}
          <span>{filter.value}</span>

          {/* Hover view (using Tailwind CSS 'group-hover') */}
          <span className="absolute top-0 left-0 hidden h-full w-full items-center justify-center bg-inherit p-[inherit] group-hover:flex">
            <span className="truncate">{filter.value}</span>
            <span className="ml-1 text-nowrap">X</span>
          </span>
        </button>
      ))}
    </>
  );
}
