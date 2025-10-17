import Filter from "@/components/browse/Filter.tsx";
import { useEffect, useState } from "react";
import { FilterIcon, Loader2Icon } from "lucide-react";
import FilterChips from "@/components/browse/FilterChips.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "./ui/dialog";
import { Button } from "@/components/ui/button.tsx";
import ProductCard from "@/components/browse/ProductCard.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select.tsx";

// Mock product data generation
const products: {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  inCart: boolean;
}[] = [];
const productMocks = [
  {
    name: "Lotus Esprit S1",
    description: "From 'The Spy Who Loved Me'",
    price: 25500,
    image: "https://placehold.co/300"
  },
  {
    name: "Toyota Supra",
    description: "From 'The Fast and the Furious'",
    price: 15250,
    image: "https://placehold.co/300"
  },
  {
    name: "Exhaust Muffler",
    description: "For when your car is too loud",
    price: 300,
    image: "https://placehold.co/300"
  },
  {
    name: "Catalytic Converter",
    description: "Perfect exhaust gas disposal",
    price: 250,
    image: "https://placehold.co/300"
  },
  {
    name: "Brake Discs",
    description: "Selling almost new brake discs",
    price: 100,
    image: "https://placehold.co/300"
  },
  {
    name: "Headlights",
    description: "Main headlights for darkness",
    price: 80,
    image: "https://placehold.co/300"
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

function ProductsGrid() {
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
          <aside className="col-span-full hidden md:col-span-1 md:block">
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
                <Select>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price-asc">
                      Price: Low to High
                    </SelectItem>
                    <SelectItem value="price-desc">
                      Price: High to Low
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ProductsGrid />
            </div>
          </div>
          <div id="shopping-cart">
            {/* Shopping cart will be rendered here */}
          </div>
        </div>
      </div>
    </div>
  );
}
