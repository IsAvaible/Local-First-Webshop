import ProductImageCarousel from "@/components/product/ProductImageCarousel.tsx";
import ProductDetails from "@/components/product/ProductDetails.tsx";
import RelatedProducts from "@/components/product/RelatedProducts.tsx";
import ShippingInfo from "@/components/product/ShippingInfo.tsx";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";

// Mock product data generation
const products: {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  inCart: boolean;
  images?: { src: string; alt: string }[];
}[] = [];
const productMocks = [
  {
    name: "Lotus Esprit S1",
    description: "From 'The Spy Who Loved Me'",
    price: 25500,
    image: "https://placehold.co/600x400"
  },
  {
    name: "Toyota Supra",
    description: "From 'The Fast and the Furious'",
    price: 15250,
    image: "https://placehold.co/600x400"
  },
  {
    name: "Exhaust Muffler",
    description: "For when your car is too loud",
    price: 300,
    image: "https://placehold.co/600x400"
  },
  {
    name: "Catalytic Converter",
    description: "Perfect exhaust gas disposal",
    price: 250,
    image: "https://placehold.co/600x400"
  },
  {
    name: "Brake Discs",
    description: "Selling almost new brake discs",
    price: 100,
    image: "https://placehold.co/600x400"
  },
  {
    name: "Headlights",
    description: "Main headlights for darkness",
    price: 80,
    image: "https://placehold.co/600x400"
  }
];

for (let i = 0; i < 6; i++) {
  const mock = productMocks[i % productMocks.length];
  products.push({
    id: i + 1,
    name: mock.name,
    description: mock.description,
    price: mock.price,
    imageUrl: `${mock.image}?text=Product+${i + 1}`,
    inCart: i % 2 === 0,
    images: [
      {
        src: `${mock.image}?text=${mock.name.replace(/ /g, "+")}`,
        alt: mock.name
      },
      {
        src: `https://placehold.co/600?text=Side+View`,
        alt: `${mock.name} side view`
      },
      {
        src: `https://placehold.co/600?text=Interior`,
        alt: `${mock.name} interior view`
      }
    ]
  });
}

export default function Product({ productId }: { productId: string }) {
  const [product, setProduct] = useState<
    (typeof products)[0] | null | undefined
  >(undefined);
  const [relatedProducts, setRelatedProducts] = useState<typeof products>([]);

  useEffect(() => {
    // Simulate fetching data
    const timer = setTimeout(() => {
      const foundProduct = products.find(
        (p) => p.id === parseInt(productId, 10)
      );
      setProduct(foundProduct);
      if (foundProduct) {
        const related = products
          .filter((p) => p.id !== foundProduct.id)
          .slice(0, 4);
        setRelatedProducts(related);
      }
    }, 500); // 500ms delay to simulate network request
    return () => clearTimeout(timer);
  }, [productId]);

  if (product === undefined) {
    return (
      <div
        role="status"
        className="col-span-full flex aspect-square items-center justify-center"
      >
        <Loader2Icon className="h-8 w-8 animate-spin fill-slate-800 text-gray-200 dark:text-gray-600" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="col-span-full flex aspect-[2/1] items-center justify-center">
        <div className="alert alert-error">Product not found.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
      <div className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2">
        <div>
          <ProductImageCarousel images={product.images ?? []} />
        </div>
        <div>
          <ProductDetails product={product} />
        </div>
      </div>
      <div className="mt-16">
        <ShippingInfo />
      </div>
      <div className="mt-16">
        <RelatedProducts products={relatedProducts} />
      </div>
    </div>
  );
}
