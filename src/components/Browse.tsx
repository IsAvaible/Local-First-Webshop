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
import { Cart } from "@/components/cart/Cart";
import { Button } from "@/components/ui/button.tsx";
import ProductCard from "@/components/browse/ProductCard.tsx";
import type { Product, Category, Company } from "@/db/schema.ts";
import BrowseSortSelect from "@/components/browse/BrowseSortSelect.tsx";

export default function Browse({
  loading,
  products,
  categories,
  companies
}: {
  loading: boolean;
  products: (Product & { min_price: number | null })[] | undefined;
  categories: Category[] | undefined;
  companies: Company[] | undefined;
}) {
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
          <aside className="col-span-full hidden justify-end md:col-span-1 md:flex">
            <Filter categories={categories} companies={companies} />
          </aside>
          <div className="col-span-full max-w-5xl md:col-span-1 md:col-start-2">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
              <div className="col-span-full flex flex-row items-start gap-2">
                <FilterChips />
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
                      <Filter categories={categories} companies={companies} />
                    </DialogContent>
                  </Dialog>
                )}
                <div className="md:flex-grow"></div>
                <BrowseSortSelect />
              </div>
              {loading && (!products || products.length === 0) ? (
                <div
                  role="status"
                  className="col-span-full flex aspect-square items-center justify-center"
                >
                  <Loader2Icon className="h-8 w-8 animate-spin fill-slate-800 text-gray-200 dark:text-gray-600" />
                  <span className="sr-only">Loading...</span>
                </div>
              ) : !products || products.length === 0 ? (
                <div className="col-span-full flex aspect-[2/1] items-center justify-center">
                  <div className="alert alert-info flex flex-col">
                    No articles found. Please try change your search or filters.
                    <a href="/search">Reset search & filters</a>
                  </div>
                </div>
              ) : (
                <section
                  aria-description="List of articles"
                  className="col-span-full grid grid-cols-[inherit] gap-[inherit] 2xl:min-w-[1024px]"
                >
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </section>
              )}
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
