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

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  inCart: boolean;
}
interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();

  return (
    <Card className="flex flex-col overflow-hidden pt-0">
      <CardHeader className="relative p-0">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="aspect-square w-full rounded-t-lg object-cover"
        />
      </CardHeader>
      <CardContent className="flex-grow p-4">
        <CardTitle>{product.name}</CardTitle>
        <CardDescription className="mt-2 text-sm">
          {product.description}
        </CardDescription>
      </CardContent>
      <CardFooter className="mt-auto flex items-center justify-between px-4">
        <p className="text-slate-600">
          {new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: "EUR"
          }).format(product.price)}
        </p>
        <Button size="icon" onClick={() => addToCart(product.id.toString())}>
          <ShoppingCartIcon />
        </Button>
      </CardFooter>
    </Card>
  );
}
