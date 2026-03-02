import { useRelatedProductsQuery } from "@/hooks/queries/useProductQueries.ts";
import ProductCard from "@/components/browse/ProductCard";

// --- Client Component ---

interface RelatedProductsProps {
  currentProductId?: number;
}

export default function RelatedProducts({
  currentProductId
}: RelatedProductsProps) {
  // Fetch related products data via React Query
  const { data: products, isLoading } =
    useRelatedProductsQuery(currentProductId);

  // Handle Loading State
  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">You might also like</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCard.Skeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Handle Empty State
  if (!products || products.length === 0) {
    return null;
  }

  // Handle Render
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">You might also like</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            asset={product.asset}
          />
        ))}
      </div>
    </div>
  );
}
