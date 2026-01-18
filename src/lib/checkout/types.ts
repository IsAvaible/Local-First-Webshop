import type { CONFIG, FLOW_ORDER, WIZARD_STEPS } from "./config";

export type FlowStepId = (typeof FLOW_ORDER)[number];
export type WizardStepId = (typeof WIZARD_STEPS)[number];
export type ShippingMethod = keyof typeof CONFIG.SHIPPING_RATES;
