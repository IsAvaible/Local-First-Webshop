import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { inArray, asc, eq } from "drizzle-orm";

import { db } from "@/db/connection";
import {
  wishlistTable,
  productsTable,
  assetsTable,
  type Asset
} from "@/db/schema";

import ProductCard from "@/components/browse/ProductCard";
import { Button } from "@/components/ui/button";
import { HeartIcon, Search } from "lucide-react";

// --- Server Functions ---

const getWishlistItems = createServerFn({ method: "GET" }).handler(async () => {
  // 1. Fetch wishlist items joined with product data
  const wishlistRows = await db
    .select({
      wishlistId: wishlistTable.id,
      price_snapshot: wishlistTable.price_snapshot,
      product: productsTable
    })
    .from(wishlistTable)
    .innerJoin(productsTable, eq(wishlistTable.product_id, productsTable.id));

  // 2. Fetch the first asset for each product (matching the subquery logic)
  const productIds = wishlistRows.map((r) => r.product.id);
  const firstAssetByProductId = new Map<number, Asset>();

  if (productIds.length > 0) {
    const assetRows = await db
      .select()
      .from(assetsTable)
      .where(inArray(assetsTable.product_id, productIds))
      .orderBy(asc(assetsTable.id));

    for (const asset of assetRows) {
      if (!firstAssetByProductId.has(asset.product_id)) {
        firstAssetByProductId.set(asset.product_id, asset);
      }
    }
  }

  // 3. Combine and return the structured data
  return wishlistRows.map((row) => ({
    ...row,
    asset: firstAssetByProductId.get(row.product.id)
  }));
});

const removeWishlistItem = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data: { id } }) => {
    await db.delete(wishlistTable).where(eq(wishlistTable.id, id));
    return { success: true };
  });

// --- Client Component ---

export function Wishlist() {
  const queryClient = useQueryClient();

  // Fetch wishlist data
  const { data: wishlistItems, isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => getWishlistItems()
  });

  // Handle server-side deletion
  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeWishlistItem({ data: { id } }),
    onSuccess: async () => {
      // Invalidate the query to refetch the updated wishlist automatically
      await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCard.Skeleton key={i} />
        ))}
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
        const finalPrice = item.product.base_price ?? item.price_snapshot;

        return (
          <div key={item.wishlistId} className="group/wishlist relative">
            <ProductCard
              className="transform-gpu"
              product={{
                ...item.product,
                base_price: finalPrice
              }}
              asset={item.asset}
            />
            <Button
              variant={"outline"}
              size="icon"
              disabled={deleteMutation.isPending}
              className="absolute top-2 right-2 z-1 text-red-500 opacity-0 transition-opacity group-hover/wishlist:opacity-100 hover:text-red-600 disabled:opacity-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteMutation.mutate(item.wishlistId);
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
