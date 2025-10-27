import ProductImageCarousel from "@/components/product/ProductImageCarousel.tsx";
import ProductDetails from "@/components/product/ProductDetails.tsx";
import RelatedProducts from "@/components/product/RelatedProducts.tsx";
import ShippingInfo from "@/components/product/ShippingInfo.tsx";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import {
  type Asset,
  type Category,
  type Company,
  type CustomFieldDefinition,
  type CustomFieldValue,
  type PricingTier,
  type Product
} from "@/db/schema";

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
    name: "Gyro-Stabilizer Core (Model 7G)",
    description: "Maintains rotational axis alignment under high g-force.",
    price: 25500,
    image: "https://placehold.co/600x400"
  },
  {
    name: "Hydraulic Manifold Block (HMB-12)",
    description:
      "Controls high-pressure fluid distribution for primary actuators.",
    price: 15250,
    image: "https://placehold.co/600x400"
  },
  {
    name: "Harmonic Resonance Dampener",
    description:
      "Reduces high-frequency vibration in the main drive shaft assembly.",
    price: 300,
    image: "https://placehold.co/600x400"
  },
  {
    name: "Plasma Particulate Scrubber",
    description: "Filters nano-particulates from the primary exhaust manifold.",
    price: 250,
    image: "https://placehold.co/600x400"
  },
  {
    name: "Tungsten-Carbide Piston Heads (Set of 4)",
    description:
      "High-temperature, high-compression components for generator units.",
    price: 100,
    image: "https://placehold.co/600x400"
  },
  {
    name: "Optical Triangulation Sensor",
    description:
      "Precision alignment laser for robotic arm calibration (Class IIIb).",
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

export default function Product({
  loading,
  product,
  category,
  company,
  assets,
  pricingTiers,
  customFields
}: {
  loading: boolean;
  product?: Product;
  category?: Category;
  company?: Company;
  assets?: Asset[];
  pricingTiers?: PricingTier[];
  customFields?: (CustomFieldValue & CustomFieldDefinition)[];
}) {
  const [relatedProducts] = useState<typeof products>([]);

  if (loading) {
    return (
      <div role="status" className="flex h-full items-center justify-center">
        <Loader2Icon className="h-12 w-12 animate-spin text-gray-800 dark:text-gray-600" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (!product || !category || !company || !assets || !pricingTiers) {
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
          <ProductImageCarousel
            images={assets
              .filter((asset) => asset.mime_type.startsWith("image/"))
              .map((asset) => ({ src: asset.url, alt: asset.alt }))}
          />
        </div>
        <div>
          <ProductDetails
            product={product}
            pricingTiers={pricingTiers}
            customFields={customFields}
          />
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
