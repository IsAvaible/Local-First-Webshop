import { Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import ProductCard from "@/components/browse/ProductCard";

// Mock Data for items not yet in DB schema
const WISHLIST_MOCK = [
  {
    id: 1,
    name: "Minimalist Leather Backpack",
    description: null,
    min_price: 14.0,
    company_id: 1,
    category_id: 1,
    base_product_id: null,
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=150&q=80",
    created_at: new Date()
  }
];

export function ProfileWishlist() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">My Wishlist</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {WISHLIST_MOCK.map((item) => (
          <ProductCard key={item.id} product={item} imageUrl={item.image} />
        ))}
        <Link
          to={"/search"}
          className="border-muted text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted/50 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all"
        >
          <Search className="mb-2 h-8 w-8" />
          <p className="font-medium">Browse products</p>
        </Link>
      </div>
    </div>
  );
}
