import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

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
  return (
    <Card className="flex flex-col overflow-hidden">
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
      <CardFooter className="mt-auto flex flex-col items-end">
        <p className="text-slate-600">
          {new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: "EUR"
          }).format(product.price)}
        </p>
      </CardFooter>
    </Card>
  );
}
