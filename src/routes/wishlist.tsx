import { createFileRoute } from "@tanstack/react-router";
import { Wishlist } from "@/components/wishlist/Wishlist.tsx";

import {
  wishlistCollection,
  productsCollection,
  assetsCollection,
  pricingTiersCollection
} from "@/lib/collections";

export const Route = createFileRoute("/wishlist")({
  ssr: false,
  loader: async () => {
    await Promise.all([
      wishlistCollection.preload(),
      productsCollection.preload(),
      assetsCollection.preload(),
      pricingTiersCollection.preload()
    ]);
  },
  component: WishlistPage
});

function WishlistPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
        My Wishlist
      </h1>

      <Wishlist />
    </div>
  );
}
