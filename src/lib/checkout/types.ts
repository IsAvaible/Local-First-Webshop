import type { Product, Asset } from "@/db/schema";
import type { CONFIG, FLOW_ORDER, WIZARD_STEPS } from "./config";

export type FlowStepId = (typeof FLOW_ORDER)[number];
export type WizardStepId = (typeof WIZARD_STEPS)[number];
export type ShippingMethod = keyof typeof CONFIG.SHIPPING_RATES;
export type ProductSuggestion = Product & { asset?: Asset; min_price?: number };
