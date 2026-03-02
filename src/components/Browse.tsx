import Filter from "@/components/browse/Filter.tsx";
import {
  useEffect,
  useState,
  useMemo,
  forwardRef,
  type HTMLAttributes,
  useCallback
} from "react";
import { FilterIcon } from "lucide-react";
import FilterChips from "@/components/browse/FilterChips.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { cn, type JsonValue } from "@/lib/utils.ts";
import { Link } from "@tanstack/react-router";
import { VirtuosoGrid } from "react-virtuoso";
import { getSearchPageData, type ProductSearch } from "@/routes/search.tsx";

export default function Browse({
  loading,
  products: initialProducts,
  categories,
  companies,
  customFieldDefinitions,
  customFieldValues: initialCustomFieldValues,
  hasNextPage: initialHasNextPage,
  currentSearch,
  totalCount
}: {
  loading: boolean;
  products: (Product & { asset?: Asset })[] | undefined;
  categories: (Category & { count: number })[] | undefined;
  companies: (Company & { count: number })[] | undefined;
  customFieldDefinitions?: CustomFieldDefinition[] | undefined;
  customFieldValues?: CustomFieldValue[] | undefined;
  hasNextPage?: boolean;
  currentSearch: ProductSearch;
  totalCount: number;
}) {
  // State to hold the accumulated list of products
  const [products, setProducts] = useState(initialProducts ?? []);
  const [customFieldValues, setCustomFieldValues] = useState(
    initialCustomFieldValues ?? []
  );
  const [hasNextPage, setHasNextPage] = useState(initialHasNextPage ?? false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const [filterDialogVisible, setFilterDialogVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Safely read `window` on the client immediately after mount
    setIsMobile(window.innerWidth <= 1536);

    const handleScreenSizeChange = () => {
      const mobile = window.innerWidth <= 1536;
      setIsMobile(mobile);
      if (!mobile) setFilterDialogVisible(false);
    };

    window.addEventListener("resize", handleScreenSizeChange);
    return () => window.removeEventListener("resize", handleScreenSizeChange);
  }, []);

  // Reset state if the base search/filters change (URL change)
  useEffect(() => {
    setProducts(initialProducts ?? []);
    setCustomFieldValues(initialCustomFieldValues ?? []);
    setHasNextPage(initialHasNextPage ?? false);
  }, [initialProducts, initialCustomFieldValues, initialHasNextPage]);

  // The function Virtuoso will call when the user scrolls near the bottom
  const loadMore = useCallback(async () => {
    console.log("load", hasNextPage, isFetchingNextPage);
    if (!hasNextPage || isFetchingNextPage) return;

    setIsFetchingNextPage(true);
    try {
      const nextOffset = products.length;

      // Call your TanStack Start server function directly
      const nextData = await getSearchPageData({
        data: {
          ...currentSearch,
          offset: nextOffset,
          limit: 24
        }
      });

      // Append the new data to the existing state
      setProducts((prev) => [...prev, ...nextData.products]);
      setCustomFieldValues((prev) => [...prev, ...nextData.customFieldValues]);
      setHasNextPage(nextData.hasNextPage);
    } catch (error) {
      console.error("Failed to load more products:", error);
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [hasNextPage, isFetchingNextPage, products.length, currentSearch]);

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
        <div className="relative grid w-full gap-8 px-8 2xl:grid-cols-[1fr_auto_minmax(0,1fr)] 2xl:gap-12">
          <aside className="sticky top-28 col-span-full mt-8 hidden h-full max-h-[calc(100vh-10rem)] justify-end self-start overflow-y-auto 2xl:col-span-1 2xl:flex">
            <Filter
              className="sticky h-fit w-80 rounded-lg bg-white p-4 shadow-md dark:bg-slate-800"
              categories={categories}
              companies={companies}
              customFieldDefinitions={customFieldDefinitions}
            />
          </aside>
          <div className="col-span-full mx-auto w-full max-w-5xl 2xl:col-span-1 2xl:col-start-2 2xl:mx-0">
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
                      <DialogTitle className="sr-only">
                        Product Filters
                      </DialogTitle>
                      <DialogDescription className="sr-only">
                        Apply categories, companies, and custom fields to filter
                        the product list.
                      </DialogDescription>

                      <Filter
                        className="mx-auto w-full"
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
                <div className="grow"></div>
                <BrowseSortSelect
                  customFieldDefinitions={customFieldDefinitions}
                />
              </div>

              {loading && (!products || products.length === 0) ? (
                <div
                  role="status"
                  aria-label="Loading products"
                  className="col-span-full grid w-full grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3"
                >
                  {Array.from({ length: 9 }).map((_, i) => (
                    <ProductCard.Skeleton key={i} />
                  ))}
                  <span className="sr-only">Loading products...</span>
                </div>
              ) : !products || products.length === 0 ? (
                <div className="col-span-full flex aspect-2/1 items-center justify-center">
                  <div className="alert alert-info flex flex-col">
                    No articles found. Please try change your search or filters.
                    <Link to="/search">Reset search & filters</Link>
                  </div>
                </div>
              ) : (
                <>
                  {/* Hidden tracker for E2E tests to bypass virtual scrolling limitations */}
                  <span
                    data-testid="total-product-count"
                    data-count={totalCount}
                    className="sr-only"
                  />

                  <VirtuosoGrid
                    useWindowScroll
                    className="col-span-full w-full 2xl:min-w-5xl"
                    data={products}
                    overscan={500}
                    endReached={
                      hasNextPage && !isFetchingNextPage ? loadMore : undefined
                    }
                    components={virtuosoComponents}
                    context={{ isFetchingNextPage }}
                    itemContent={(_index, product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        customFields={productCustomFields.get(product.id)}
                        asset={product.asset}
                        lazy={false}
                      />
                    )}
                  />
                </>
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

// Define the grid container for Virtuoso.
// eslint-disable-next-line react-x/no-forward-ref
const GridList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      {...props}
      ref={ref}
      aria-description="List of products matching the current search and filters"
      className={cn(
        "grid w-full grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3",

        className
      )}
    />
  )
);

GridList.displayName = "GridList";

// eslint-disable-next-line react-x/no-forward-ref
const GridItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div
      {...props}
      ref={ref}
      className={cn("flex h-full w-full flex-col", className)}
    >
      {children}
    </div>
  )
);

GridItem.displayName = "GridItem";

// eslint-disable-next-line react-x/no-forward-ref
const GridFooter = forwardRef<
  HTMLDivElement,
  { context?: { isFetchingNextPage: boolean } }
>(({ context }, ref) => {
  if (!context?.isFetchingNextPage) return null;
  return (
    <div ref={ref} className="p-4 text-center">
      Loading more...
    </div>
  );
});
GridFooter.displayName = "GridFooter";

const virtuosoComponents = {
  List: GridList,
  Item: GridItem,
  Footer: GridFooter
};
