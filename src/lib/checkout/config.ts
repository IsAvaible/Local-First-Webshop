export const CONFIG = {
  TAX_RATE: 0.19,
  WARRANTY_RATE: 0.1,
  COUPONS: {
    SAVE20: 20
  } as Record<string, number>,
  SHIPPING_RATES: {
    standard: 5.99,
    express: 14.99,
    pickup: 0
  } as const
};

// 1. Define the exact linear flow of the application
export const WIZARD_STEPS = [
  "address",
  "shipping",
  "payment",
  "review"
] as const;
export const FLOW_ORDER = ["overview", ...WIZARD_STEPS, "success"] as const;
