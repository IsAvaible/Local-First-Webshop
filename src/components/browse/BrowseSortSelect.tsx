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
import { type Product } from "@/db/schema.ts";
import { useMemo } from "react";
import {
  ArrowDown01Icon,
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
  switch (property) {
    case "name":
      return dir === "asc" ? <ArrowUpAZIcon /> : <ArrowDownAZIcon />;

    case "price":
    case "id":
      return dir === "asc" ? <ArrowUp10Icon /> : <ArrowDown01Icon />;

    default:
      return dir === "asc" ? <ArrowUpIcon /> : <ArrowDownIcon />;
  }
};

export default function BrowseSortSelect() {
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
      order: val as ProductSearch["order"],
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
      <SelectTrigger>
        <SelectValue placeholder="Sort by">
          {capitalize(order)} <DirComponent property={order} dir={dir} />
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
          <div className="flex gap-1 p-2">
            <Select
              onValueChange={handleCustomPropertyChange}
              value={customProperty}
            >
              <SelectTrigger>
                <SelectValue placeholder="Property" />
              </SelectTrigger>
              <SelectContent>
                {sortableProperties.map((prop) => (
                  <SelectItem key={prop} value={prop}>
                    {capitalize(prop)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={handleCustomOrderChange} value={customOrder}>
              <SelectTrigger>
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
