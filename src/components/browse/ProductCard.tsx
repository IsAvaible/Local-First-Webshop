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
import { humanizeCustomFieldValue } from "@/lib/utils.ts";

interface ProductCardProps {
  product: Product & { min_price: number | null };
  customFields?:
    | Record<string, { value: JsonValue; type?: string }>
    | undefined;
  imageUrl?: string | undefined;
}

export default function ProductCard({
  product,
  customFields,
  imageUrl
}: ProductCardProps) {
  const { addItem } = useCart();

  return (
    <Card className="flex h-full flex-col overflow-hidden pt-0">
      <Link to={"/products/$productId"} params={{ productId: product.id }}>
        <CardHeader className="relative p-0">
          <img
            src={imageUrl}
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
              {Object.entries(customFields).map(([k, v]) => {
                const humanized = humanizeCustomFieldValue(v?.value, v?.type);
                return (
                  <span
                    key={k}
                    className="rounded bg-gray-100 px-2 py-1 text-xs font-medium"
                    title={humanized}
                  >
                    {k}: {humanized}
                  </span>
                );
              })}
            </div>
          )}
        </CardContent>
      </Link>
      <CardFooter className="mt-auto flex items-center justify-between px-4">
        <p className="text-slate-600">
          {new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: "EUR"
          }).format(product.min_price ?? 0)}
        </p>
        <Button
          size="icon"
          onClick={() => {
            addItem(product.id, (product.min_price ?? 0).toFixed(2));
          }}
        >
          <ShoppingCartIcon />
        </Button>
      </CardFooter>
    </Card>
  );
}
