import ProductImageCarousel from "@/components/product/ProductImageCarousel.tsx";
import ProductDetails from "@/components/product/ProductDetails.tsx";
import RelatedProducts from "@/components/product/RelatedProducts.tsx";
import ShippingInfo from "@/components/product/ShippingInfo.tsx";
import {
  type Asset,
  type Category,
  type Company,
  type CustomFieldDefinition,
  type CustomFieldValue,
  type PricingTier,
  type Product
} from "@/db/schema";
import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";

export default function Product({
  loading,
  product,
  category,
  company,
  assets,
  pricingTiers,
  customFields,
  isInWishlist,
  onToggleWishlist
}: {
  loading: boolean;
  product?: Product;
  category?: Category;
  company?: Company;
  assets?: Asset[];
  pricingTiers?: PricingTier[];
  customFields?: (CustomFieldValue & CustomFieldDefinition)[];
  isInWishlist?: boolean;
  onToggleWishlist?: () => void;
}) {
  const [showSyncing, setShowSyncing] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (loading) {
      // Wait 500ms before showing the badge
      timeout = setTimeout(() => {
        setShowSyncing(true);
      }, 500);
    } else {
      setShowSyncing(false);
    }

    return () => clearTimeout(timeout);
  }, [loading, showSyncing]);

  if (!product || !category || !company || !assets || !pricingTiers) {
    if (loading) {
      return (
        <div role="status" className="flex h-full items-center justify-center">
          <Loader2Icon className="h-12 w-12 animate-spin text-gray-800 dark:text-gray-600" />
          <span className="sr-only">Loading...</span>
        </div>
      );
    } else {
      return (
        <div className="col-span-full flex aspect-[2/1] items-center justify-center">
          <div className="alert alert-error">Product not found.</div>
        </div>
      );
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
      <div className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2">
        <div>
          <ProductImageCarousel
            images={assets.filter((asset) =>
              asset.mime_type.startsWith("image/")
            )}
          />
        </div>
        <div>
          <ProductDetails
            product={product}
            pricingTiers={pricingTiers}
            customFields={customFields}
            isInWishlist={isInWishlist}
            onToggleWishlist={onToggleWishlist}
            isSyncing={showSyncing}
          />
        </div>
      </div>
      <div className="mt-16">
        <ShippingInfo />
      </div>
      <div className="mt-16">
        <RelatedProducts />
      </div>
    </div>
  );
}
