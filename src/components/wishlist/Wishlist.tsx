import { Link } from "@tanstack/react-router";
import { eq, useLiveQuery, Query, min, max } from "@tanstack/react-db";
import {
  wishlistCollection,
  productsCollection,
  assetsCollection,
  pricingTiersCollection
} from "@/lib/collections";
import ProductCard from "@/components/browse/ProductCard";
import { Button } from "@/components/ui/button";
import { Loader2Icon, HeartIcon, Search } from "lucide-react";

export function Wishlist() {
  const { data: wishlistItems, isLoading } = useLiveQuery((q) => {
    // 1. Subquery: Find the minimum price for each product
    const minPriceSubquery = new Query()
      .from({ pt: pricingTiersCollection })
      .groupBy(({ pt }) => pt.product_id)
      .select(({ pt }) => ({
        product_id: pt.product_id,
        max_price: max(pt.price_per_unit)
      }));

    // 2. Subquery: Find the ID of the first asset for each product
    const firstAssetIdSubquery = new Query()
      .from({ a: assetsCollection })
      .groupBy(({ a }) => a.product_id)
      .select(({ a }) => ({
        product_id: a.product_id,
        first_asset_id: min(a.id)
      }));

    // 3. Main Query
    return (
      q
        .from({ w: wishlistCollection })
        .innerJoin({ p: productsCollection }, ({ w, p }) =>
          eq(w.product_id, p.id)
        )
        // Join calculated price
        .leftJoin({ price: minPriceSubquery }, ({ p, price }) =>
          eq(p.id, price.product_id)
        )
        // Join specific asset ID
        .leftJoin({ fa_id: firstAssetIdSubquery }, ({ p, fa_id }) =>
          eq(p.id, fa_id.product_id)
        )
        // Join actual asset data using the ID found above
        .leftJoin({ as: assetsCollection }, ({ fa_id, as }) =>
          eq(as.id, fa_id?.first_asset_id)
        )
        .select(({ w, p, as, price }) => ({
          wishlistId: w.id,
          product: p,
          asset: as,
          calculated_price: price!.max_price,
          price_snapshot: w.price_snapshot
        }))
    );
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2Icon className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!wishlistItems || wishlistItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <HeartIcon className="mb-4 h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
          No items in wishlist
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Start adding items to your wishlist while browsing.
        </p>
        <div className="mt-6">
          <Link to="/search">
            <Button>Browse Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {wishlistItems.map((item) => {
        // Logic to fall back to snapshot if live price is unavailable
        const finalPrice =
          item.calculated_price ?? parseFloat(item.price_snapshot);

        return (
          <div key={item.wishlistId} className="group/wishlist relative">
            <ProductCard
              className="transform-gpu"
              product={{
                ...item.product,
                min_price: finalPrice as number
              }}
              asset={item.asset}
            />
            <Button
              variant={"outline"}
              size="icon"
              className="absolute top-2 right-2 z-1 text-red-500 opacity-0 transition-opacity group-hover/wishlist:opacity-100 hover:text-red-600"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                wishlistCollection.delete(item.wishlistId);
              }}
            >
              <HeartIcon className="h-4 w-4 fill-current" />
              <span className="sr-only">Remove from wishlist</span>
            </Button>
          </div>
        );
      })}

      {/* Browse More Card */}
      <Link
        to={"/search"}
        className="border-muted text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted/50 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all"
      >
        <Search className="mb-2 h-8 w-8" />
        <p className="font-medium">Browse products</p>
      </Link>
    </div>
  );
}
