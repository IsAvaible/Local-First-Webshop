import Filter from "@/components/browse/Filter.tsx";
import { useEffect, useMemo, useState } from "react";
import { FilterIcon, Loader2Icon } from "lucide-react";
import FilterChips from "@/components/browse/FilterChips.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "./ui/dialog";
import { Cart } from "@/components/cart/Cart";
import { Button } from "@/components/ui/button.tsx";
import ProductCard from "@/components/browse/ProductCard.tsx";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select.tsx";

// Mock product data generation
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  inCart: boolean;
}
const products: Product[] = [];
const productMocks = [
  {
    name: "Gyro-Stabilizer Core (Model 7G)",
    description: "Maintains rotational axis alignment under high g-force.",
    price: 25500,
    image: "https://placehold.co/600x400"
  },
  {
    name: "Hydraulic Manifold Block (HMB-12)",
    description:
      "Controls high-pressure fluid distribution for primary actuators.",
    price: 15250,
    image: "https://placehold.co/600x400"
  },
  {
    name: "Harmonic Resonance Dampener",
    description:
      "Reduces high-frequency vibration in the main drive shaft assembly.",
    price: 300,
    image: "https://placehold.co/600x400"
  },
  {
    name: "Plasma Particulate Scrubber",
    description: "Filters nano-particulates from the primary exhaust manifold.",
    price: 250,
    image: "https://placehold.co/600x400"
  },
  {
    name: "Tungsten-Carbide Piston Heads (Set of 4)",
    description:
      "High-temperature, high-compression components for generator units.",
    price: 100,
    image: "https://placehold.co/600x400"
  },
  {
    name: "Optical Triangulation Sensor",
    description:
      "Precision alignment laser for robotic arm calibration (Class IIIb).",
    price: 80,
    image: "https://placehold.co/600x400"
  }
];

for (let i = 0; i < 6; i++) {
  const mock = productMocks[i % productMocks.length];
  products.push({
    id: i + 1,
    name: mock.name,
    description: mock.description,
    price: mock.price,
    imageUrl: `${mock.image}?text=Product+${i + 1}`,
    inCart: i % 2 === 0 // Mock some items being in cart
  });
}

// Define which properties are sortable
// This will need to be dynamically generated from the available products later
const sortableProperties: (keyof Product)[] = ["id", "name", "price"];

// Helper to capitalize first letter
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function ProductsGrid({ products }: { products: Product[] }) {
  const [loading] = useState(false);
  const [error] = useState(false);

  if (loading && !products.length) {
    return (
      <div
        role="status"
        className="col-span-full flex aspect-square items-center justify-center"
      >
        <Loader2Icon className="h-8 w-8 animate-spin fill-slate-800 text-gray-200 dark:text-gray-600" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="col-span-full flex aspect-[2/1] items-center justify-center">
        <div className="alert alert-error">
          An error occurred while loading the articles
        </div>
      </div>
    );
  }

  if (!loading && products.length === 0) {
    return (
      <div className="col-span-full flex aspect-[2/1] items-center justify-center">
        <div className="alert alert-info flex flex-col">
          No articles found. Please try change your search or filters.
          <a href="#">Reset search & filters</a>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-description="List of articles"
      className="col-span-full grid grid-cols-[inherit] gap-[inherit] 2xl:min-w-[1024px]"
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </section>
  );
}

export default function Browse() {
  const [filterChips] = useState([
    { name: "Price", value: "2-10€", clear: () => null },
    { name: "Condition", value: "New", clear: () => null }
  ]);
  const [filterDialogVisible, setFilterDialogVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sortBy, setSortBy] = useState("popularity"); // Default to popularity

  // State for the custom sort dropdowns
  const [customProperty, setCustomProperty] = useState<keyof Product | "">("");
  const [customOrder, setCustomOrder] = useState("");

  // Effect to update main sort state when custom selects change
  useEffect(() => {
    if (customProperty && customOrder) {
      setSortBy(`custom-${customProperty}-${customOrder}`);
    }
  }, [customProperty, customOrder]);

  // Effect to clear custom selects when a preset sort is chosen
  useEffect(() => {
    if (sortBy && !sortBy.startsWith("custom-")) {
      setCustomProperty("");
      setCustomOrder("");
    }
  }, [sortBy]);

  const sortedProducts = useMemo(() => {
    const sorted = [...products];

    if (sortBy.startsWith("custom-")) {
      try {
        const [, prop, order] = sortBy.split("-");
        const property = prop as keyof Product;

        return sorted.sort((a, b) => {
          const valA = a[property];
          const valB = b[property];

          let comparison = 0;
          if (typeof valA === "number" && typeof valB === "number") {
            comparison = valA - valB;
          } else if (typeof valA === "string" && typeof valB === "string") {
            comparison = valA.localeCompare(valB);
          } else if (typeof valA === "boolean" && typeof valB === "boolean") {
            // false (0) comes before true (1)
            comparison = valA === valB ? 0 : valA ? 1 : -1;
          } else {
            // Fallback for mixed/other types
            if (valA > valB) comparison = 1;
            else if (valA < valB) comparison = -1;
          }

          return order === "asc" ? comparison : -comparison;
        });
      } catch (e) {
        console.error("Error during custom sort:", e);
        return sorted; // Return unsorted on error
      }
    }

    // Handle preset sorting
    switch (sortBy) {
      case "price-asc":
        return sorted.sort((a, b) => a.price - b.price);
      case "price-desc":
        return sorted.sort((a, b) => b.price - a.price);
      case "popularity":
      default:
        return sorted;
    }
  }, [sortBy]);

  useEffect(() => {
    const handleScreenSizeChange = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setFilterDialogVisible(false);
      }
    };
    window.addEventListener("resize", handleScreenSizeChange);
    return () => window.removeEventListener("resize", handleScreenSizeChange);
  }, []);

  return (
    <div className="mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-center text-5xl font-extrabold tracking-tight text-gray-900 md:text-6xl dark:text-slate-100">
          Browse our Products
        </h1>
      </div>
      <div className="w-full">
        <div className="relative grid w-full gap-8 px-8 md:grid-cols-[1fr_auto_minmax(0,1fr)] 2xl:gap-12">
          <aside className="col-span-full hidden justify-end md:col-span-1 md:flex">
            <Filter />
          </aside>
          <div className="col-span-full max-w-5xl md:col-span-1 md:col-start-2">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
              <div className="col-span-full flex flex-row items-start gap-2">
                <FilterChips filters={filterChips} />
                {isMobile && (
                  <Dialog
                    open={filterDialogVisible}
                    onOpenChange={setFilterDialogVisible}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="ml-auto aspect-square p-2"
                      >
                        <FilterIcon className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Configure Filters</DialogTitle>
                      </DialogHeader>
                      <Filter></Filter>
                    </DialogContent>
                  </Dialog>
                )}
                <div className="md:flex-grow"></div>
                <Select onValueChange={setSortBy} value={sortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popularity">Popularity</SelectItem>
                    <SelectGroup>
                      <SelectLabel>Price</SelectLabel>
                      <SelectItem value="price-asc">Low to High</SelectItem>
                      <SelectItem value="price-desc">High to Low</SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Custom</SelectLabel>
                      {/* This hidden SelectItem is rendered to display the custom sort order in the trigger */}
                      {customProperty && customOrder ? (
                        <SelectItem
                          key={sortBy}
                          value={sortBy}
                          className={"hidden"}
                        >
                          {`${capitalize(customProperty)} ${capitalize(
                            customOrder
                          )}`}
                        </SelectItem>
                      ) : (
                        ""
                      )}

                      <div className="flex gap-1 p-2">
                        <Select
                          onValueChange={(val) =>
                            setCustomProperty(val as keyof Product)
                          }
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
                        <Select
                          onValueChange={setCustomOrder}
                          value={customOrder}
                        >
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
              </div>
              <ProductsGrid products={sortedProducts} />
            </div>
          </div>
          <div id="shopping-cart" className="3xl:block hidden">
            <Cart />
          </div>
        </div>
      </div>
    </div>
  );
}
