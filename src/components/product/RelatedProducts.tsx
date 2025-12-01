import ProductCard from "@/components/browse/ProductCard";
import type { Product, Asset } from "@/db/schema";

export type RelatedProduct = Product & {
  min_price: number | null;
  asset?: Asset;
};

export default function RelatedProducts({
  products
}: {
  products: RelatedProduct[];
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100">
        You might also like
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            imageUrl={product.asset?.url}
          />
        ))}
      </div>
    </div>
  );
}
