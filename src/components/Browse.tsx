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
import { Route } from "@/routes/search.tsx";
import type { JsonValue } from "@/lib/utils.ts";

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

  // Apply client-side sorting when ordering by a custom field
  const search = Route.useSearch();
  const sortedProducts = useMemo(() => {
    if (!products) return products;
    const order = search.order ?? "price";
    const dir = search.dir ?? "desc";

    // If order is a defined custom field, sort client-side
    const isCustom = customFieldDefinitions?.some(
      (d) => d.field_name === order
    );
    if (!isCustom) return products;

    const collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: "base"
    });

    const copy = [...products];
    copy.sort((a, b) => {
      const av = productCustomFields.get(a.id)?.[order]?.value;
      const bv = productCustomFields.get(b.id)?.[order]?.value;

      // Handle undefineds
      if (av === undefined && bv === undefined) return 0;
      if (av === undefined) return dir === "asc" ? -1 : 1;
      if (bv === undefined) return dir === "asc" ? 1 : -1;

      // Try numeric compare if both are numbers
      const an = typeof av === "number" ? av : Number(av);
      const bn = typeof bv === "number" ? bv : Number(bv);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) {
        return dir === "asc" ? an - bn : bn - an;
      }

      // Fallback to locale string compare
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      const as = String(av);
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      const bs = String(bv);
      return dir === "asc"
        ? collator.compare(as, bs)
        : collator.compare(bs, as);
    });

    return copy;
  }, [
    products,
    search.order,
    search.dir,
    customFieldDefinitions,
    productCustomFields
  ]);

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
            <Filter
              categories={categories}
              companies={companies}
              customFieldDefinitions={customFieldDefinitions}
            />
          </aside>
          <div className="col-span-full max-w-5xl md:col-span-1 md:col-start-2">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
              <div className="col-span-full flex flex-row items-start gap-2">
                <FilterChips
                  categories={categories}
                  companies={companies}
                  customFieldDefinitions={customFieldDefinitions}
                />
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
                      <Filter
                        categories={categories}
                        companies={companies}
                        customFieldDefinitions={customFieldDefinitions}
                      />
                    </DialogContent>
                  </Dialog>
                )}
                <div className="md:flex-grow"></div>
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
                    <a href="/search">Reset search & filters</a>
                  </div>
                </div>
              ) : (
                <section
                  aria-description="List of articles"
                  className="col-span-full grid grid-cols-[inherit] gap-[inherit] 2xl:min-w-[1024px]"
                >
                  {sortedProducts!.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      customFields={productCustomFields.get(product.id)}
                      imageUrl={product.asset?.url}
                    />
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
