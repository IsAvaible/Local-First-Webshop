import Big from "big.js";
import { CONFIG } from "@/lib/checkout/config.ts";

// Define the shape of an item required for calculation
export interface CalcItem {
  price: string | number;
  quantity: number;
  hasWarranty: boolean;
}

export interface CalculationResult {
  subtotal: Big;
  warrantyCost: Big;
  shippingCost: Big;
  tax: Big;
  discount: Big;
  total: Big;
  // Helper to get formatted strings for UI/JSON responses
  formatted: {
    subtotal: string;
    warrantyCost: string;
    shippingCost: string;
    tax: string;
    discount: string;
    total: string;
  };
}

export const calculateOrderTotals = (
  items: CalcItem[],
  shippingMethod: keyof typeof CONFIG.SHIPPING_RATES,
  couponCode: string | null
): CalculationResult => {
  // Return zeros if no items exist
  if (items.length === 0) {
    const zero = new Big(0);
    return {
      subtotal: zero,
      warrantyCost: zero,
      shippingCost: zero,
      tax: zero,
      discount: zero,
      total: zero,
      formatted: {
        subtotal: "0.00",
        warrantyCost: "0.00",
        shippingCost: "0.00",
        tax: "0.00",
        discount: "0.00",
        total: "0.00"
      }
    };
  }

  // 1. Calculate Subtotal & Warranty in one pass
  const { subtotal, warrantyCost } = items.reduce(
    (acc, item) => {
      const price = new Big(item.price || 0);
      const qty = new Big(item.quantity || 1);

      // Add to Subtotal
      acc.subtotal = acc.subtotal.plus(price.times(qty));

      // Add to Warranty if active
      if (item.hasWarranty) {
        const warrantyItemCost = price.times(qty).times(CONFIG.WARRANTY_RATE);
        acc.warrantyCost = acc.warrantyCost.plus(warrantyItemCost);
      }

      return acc;
    },
    { subtotal: new Big(0), warrantyCost: new Big(0) }
  );

  // 2. Shipping
  const shippingRate = CONFIG.SHIPPING_RATES[shippingMethod] ?? 0;
  const shippingCost = new Big(shippingRate);

  // 3. Tax
  // Logic: Tax Base = Subtotal + Warranty + Shipping
  const preTaxTotal = subtotal.plus(warrantyCost).plus(shippingCost);
  const tax = preTaxTotal.times(CONFIG.TAX_RATE);

  // 4. Discount
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const discountVal = (couponCode && CONFIG.COUPONS[couponCode]) || 0;
  const discount = new Big(discountVal);

  // 5. Final Total
  // Logic: (Subtotal + Warranty + Shipping) + Tax - Discount
  const total = preTaxTotal.plus(tax).minus(discount);

  return {
    subtotal,
    warrantyCost,
    shippingCost,
    tax,
    discount,
    total,
    formatted: {
      subtotal: subtotal.toFixed(2),
      warrantyCost: warrantyCost.toFixed(2),
      shippingCost: shippingCost.toFixed(2),
      tax: tax.toFixed(2),
      discount: discount.toFixed(2),
      total: total.toFixed(2)
    }
  };
};
