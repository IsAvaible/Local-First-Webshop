import { Wishlist } from "@/components/wishlist/Wishlist.tsx";

export function ProfileWishlist() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">My Wishlist</h2>
      <Wishlist />
    </div>
  );
}
