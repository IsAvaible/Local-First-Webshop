import { useCart } from "@/contexts/useCartContext.ts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { ShoppingCartIcon } from "lucide-react";
import type { Product } from "@/db/schema.ts";
import { Link } from "@tanstack/react-router";
import type { JsonValue } from "@/lib/utils.ts";

interface ProductCardProps {
  product: Product & { min_price: number | null };
  customFields?: Record<string, JsonValue | undefined> | undefined;
}

export default function ProductCard({
  product,
  customFields
}: ProductCardProps) {
  const { addToCart } = useCart();

  return (
    <Link to={"/products/$productId"} params={{ productId: product.id }}>
      <Card className="flex flex-col overflow-hidden pt-0">
        <CardHeader className="relative p-0">
          <img
            src={"https://placehold.co/600x400"}
            alt={product.name}
            className="aspect-square w-full rounded-t-lg object-cover"
          />
        </CardHeader>
        <CardContent className="flex-grow p-4">
          <CardTitle>{product.name}</CardTitle>
          <CardDescription className="mt-2 text-sm">
            {product.description}
          </CardDescription>

          {customFields && Object.keys(customFields).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(customFields).map(([k, v]) => (
                <span
                  key={k}
                  className="rounded bg-gray-100 px-2 py-1 text-xs font-medium"
                  title={String(v)}
                >
                  {k}: {typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}
                </span>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="mt-auto flex items-center justify-between px-4">
          <p className="text-slate-600">
            {new Intl.NumberFormat("de-DE", {
              style: "currency",
              currency: "EUR"
            }).format(product.min_price ?? 0)}
          </p>
          <Button size="icon" onClick={() => addToCart(product.id.toString())}>
            <ShoppingCartIcon />
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
