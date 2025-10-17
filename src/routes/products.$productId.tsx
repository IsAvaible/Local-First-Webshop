import { createFileRoute } from "@tanstack/react-router";
import Product from "@/components/Product.tsx";

export const Route = createFileRoute("/products/$productId")({
  component: ProductPage
});

function ProductPage() {
  const { productId } = Route.useParams();
  return <Product productId={productId} />;
}
