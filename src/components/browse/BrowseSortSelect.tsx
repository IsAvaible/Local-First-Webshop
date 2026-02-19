import { type ProductSearch, Route, useSetSearch } from "@/routes/search.tsx";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select.tsx";
import type { Product, CustomFieldDefinition } from "@/db/schema.ts";
import { useMemo } from "react";
import {
  ArrowDown10Icon,
  ArrowDownAZIcon,
  ArrowDownIcon,
  ArrowUp10Icon,
  ArrowUpAZIcon,
  ArrowUpIcon
} from "lucide-react";

// Define which properties are sortable
const sortableProperties: (keyof Product)[] = ["id", "name"];

// Helper to capitalize first letter
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Define presets for easier logic and display mapping
const PRESET_VALUES: Record<string, string> = {
  "popularity-desc": "Popularity",
  "price-asc": "Lowest Price",
  "price-desc": "Highest Price"
};
const presetKeys = Object.keys(PRESET_VALUES);

const DirComponent = ({
  property,
  dir
}: {
  property: string;
  dir: "asc" | "desc";
}) => {
  const screenReaderText = (
    <span className="sr-only">
      {dir === "asc" ? "Ascending" : "Descending"}
    </span>
  );

  switch (property) {
    case "name":
      return (
        <>
          {screenReaderText}
          {dir === "asc" ? (
            <ArrowUpAZIcon aria-hidden="true" focusable="false" />
          ) : (
            <ArrowDownAZIcon aria-hidden="true" focusable="false" />
          )}
        </>
      );

    case "price":
    case "id":
      return (
        <>
          {screenReaderText}
          {dir === "asc" ? (
            <ArrowUp10Icon aria-hidden="true" focusable="false" />
          ) : (
            <ArrowDown10Icon aria-hidden="true" focusable="false" />
          )}
        </>
      );

    default:
      return (
        <>
          {screenReaderText}
          {dir === "asc" ? (
            <ArrowUpIcon aria-hidden="true" focusable="false" />
          ) : (
            <ArrowDownIcon aria-hidden="true" focusable="false" />
          )}
        </>
      );
  }
};

export default function BrowseSortSelect({
  customFieldDefinitions
}: {
  customFieldDefinitions?: CustomFieldDefinition[] | undefined;
}) {
  const search: ProductSearch = Route.useSearch();
  const setSearch = useSetSearch();

  const { order = "popularity", dir = "desc" } = search;
  const sortBy = `${order}-${dir}`;

  const isPreset = useMemo(() => presetKeys.includes(sortBy), [sortBy]);

  const customProperty = isPreset ? undefined : order;
  const customOrder = isPreset ? undefined : dir;

  const handleSortChange = (value: string) => {
    const [newOrder, newDir] = value.split("-");
    setSearch({ order: newOrder, dir: newDir as ProductSearch["dir"] });
  };

  const handleCustomPropertyChange = (val: string) => {
    setSearch({
      order: val,
      dir: customOrder ?? "desc"
    });
  };

  const handleCustomOrderChange = (val: string) => {
    setSearch({
      order: customProperty ?? "name",
      dir: val as ProductSearch["dir"]
    });
  };

  return (
    <Select onValueChange={handleSortChange} value={sortBy}>
      <SelectTrigger aria-label="Sort products by">
        <SelectValue placeholder="Sort by">
          <span className="flex items-center gap-2">
            {capitalize(order)} <DirComponent property={order} dir={dir} />
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="popularity-desc">Popularity</SelectItem>
        <SelectGroup>
          <SelectLabel>Price</SelectLabel>
          <SelectItem value="price-asc">Low to High</SelectItem>
          <SelectItem value="price-desc">High to Low</SelectItem>
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Custom</SelectLabel>
          <div
            className="flex gap-1 p-2"
            role="group"
            aria-label="Custom sorting options"
          >
            <Select
              onValueChange={handleCustomPropertyChange}
              value={customProperty}
            >
              <SelectTrigger aria-label="Custom sort property">
                <SelectValue placeholder="Property" />
              </SelectTrigger>
              <SelectContent>
                {sortableProperties.map((prop) => (
                  <SelectItem key={prop} value={prop}>
                    {capitalize(prop)}
                  </SelectItem>
                ))}
                {customFieldDefinitions?.map((def) => (
                  <SelectItem key={`cf-${def.id}`} value={def.field_name}>
                    {capitalize(def.field_name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={handleCustomOrderChange} value={customOrder}>
              <SelectTrigger aria-label="Custom sort order">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
