import Filter from "@/components/browse/Filter.tsx";
import { useEffect, useState, useMemo } from "react";
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
import type {
  Product,
  Category,
  Company,
  CustomFieldDefinition,
  CustomFieldValue,
  Asset
} from "@/db/schema.ts";
import BrowseSortSelect from "@/components/browse/BrowseSortSelect.tsx";
import type { JsonValue } from "@/lib/utils.ts";
import { Link } from "@tanstack/react-router";

export default function Browse({
  loading,
  products,
  categories,
  companies,
  customFieldDefinitions,
  customFieldValues
}: {
  loading: boolean;
  products:
    | (Product & { min_price: number | null; asset?: Asset })[]
    | undefined;
  categories: (Category & { count: number })[] | undefined;
  companies: (Company & { count: number })[] | undefined;
  customFieldDefinitions?: CustomFieldDefinition[] | undefined;
  customFieldValues?: CustomFieldValue[] | undefined;
}) {
  const [filterDialogVisible, setFilterDialogVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1536);

  useEffect(() => {
    const handleScreenSizeChange = () => {
      const mobile = window.innerWidth <= 1536;
      setIsMobile(mobile);
      if (!mobile) {
        setFilterDialogVisible(false);
      }
    };
    window.addEventListener("resize", handleScreenSizeChange);
    return () => window.removeEventListener("resize", handleScreenSizeChange);
  }, []);

  const productCustomFields = useMemo(() => {
    const map = new Map<
      number,
      Record<string, { value: JsonValue; type?: string }>
    >();
    if (!customFieldValues || !customFieldDefinitions) return map;
    const defById = new Map<number, CustomFieldDefinition>();
    for (const def of customFieldDefinitions) defById.set(def.id, def);

    for (const v of customFieldValues) {
      const def = defById.get(v.field_definition_id);
      if (!def) continue;
      const productEntry = map.get(v.product_id) ?? {};
      // store both value and type for consistent humanization downstream
      productEntry[def.field_name] = { value: v.value, type: def.field_type };
      map.set(v.product_id, productEntry);
    }
    return map;
  }, [customFieldValues, customFieldDefinitions]);

  return (
    <div className="mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-center text-5xl font-extrabold tracking-tight text-gray-900 md:text-6xl dark:text-slate-100">
          Browse our Products
        </h1>
      </div>
      <div className="w-full">
        <div className="relative grid w-full gap-8 px-8 md:grid-cols-[1fr_auto_minmax(0,1fr)] 2xl:gap-12">
          <aside className="sticky top-28 col-span-full mt-8 hidden h-full max-h-[calc(100vh-10rem)] justify-end self-start overflow-y-auto 2xl:col-span-1 2xl:flex">
            <Filter
              categories={categories}
              companies={companies}
              customFieldDefinitions={customFieldDefinitions}
            />
          </aside>
          <div className="col-span-full max-w-5xl md:col-span-1 md:col-start-2">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
              <div className="col-span-full flex flex-row items-start gap-2">
                {isMobile && (
                  <Dialog
                    open={filterDialogVisible}
                    onOpenChange={setFilterDialogVisible}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="relative aspect-square p-2"
                      >
                        <FilterIcon className="h-5 w-5" />
                        Filter
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Configure Filters</DialogTitle>
                      </DialogHeader>
                      <Filter
                        className="mx-auto"
                        categories={categories}
                        companies={companies}
                        customFieldDefinitions={customFieldDefinitions}
                      />
                    </DialogContent>
                  </Dialog>
                )}
                <FilterChips
                  className="max-md:hidden"
                  categories={categories}
                  companies={companies}
                  customFieldDefinitions={customFieldDefinitions}
                />
                <div className="flex-grow"></div>
                <BrowseSortSelect
                  customFieldDefinitions={customFieldDefinitions}
                />
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
                    <Link to="/search">Reset search & filters</Link>
                  </div>
                </div>
              ) : (
                <section
                  aria-description="List of articles"
                  className="col-span-full grid grid-cols-[inherit] gap-[inherit] 2xl:min-w-[1024px]"
                >
                  {products.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      customFields={productCustomFields.get(product.id)}
                      asset={product.asset}
                      lazy={index > 5}
                    />
                  ))}
                </section>
              )}
            </div>
          </div>

          <div
            id="shopping-cart"
            className="3xl:block sticky top-24 hidden h-screen self-start"
          >
            <Cart className={"w-80"} />
          </div>
        </div>
      </div>
    </div>
  );
}
