import type { Order } from "@/db/schema.ts";

export const BADGE_STYLES = {
  success: "bg-green-100 text-green-700 hover:bg-green-100 border-green-200",
  blue: "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200",
  purple: "bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200",
  danger: "bg-red-100 text-red-700 hover:bg-red-100 border-red-200",
  warning:
    "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200",
  default: "bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200"
};

export type StatusConfig = {
  label: string;
  step: number; // 0-3 for progress bar (-1 if not applicable)
  isPaid: boolean; // Counts towards total spent?
  isActive: boolean; // Is this an "active" order?
  style: string; // Tailwind classes
};

// THE SINGLE SOURCE OF TRUTH
export const ORDER_STATUS_MAP: Record<Order["status"], StatusConfig> = {
  pending: {
    label: "Pending",
    step: 0,
    isPaid: false,
    isActive: true,
    style: BADGE_STYLES.warning
  },
  awaiting_payment: {
    label: "Awaiting Payment",
    step: 0,
    isPaid: false,
    isActive: true,
    style: BADGE_STYLES.warning
  },
  processing: {
    label: "Processing",
    step: 1,
    isPaid: true,
    isActive: true,
    style: BADGE_STYLES.blue
  },
  shipped: {
    label: "Shipped",
    step: 2,
    isPaid: true,
    isActive: true,
    style: BADGE_STYLES.purple
  },
  delivered: {
    label: "Delivered",
    step: 3,
    isPaid: true,
    isActive: false,
    style: BADGE_STYLES.success
  },
  cancelled: {
    label: "Cancelled",
    step: -1,
    isPaid: false,
    isActive: false,
    style: BADGE_STYLES.danger
  },
  refunded: {
    label: "Refunded",
    step: -1,
    isPaid: false,
    isActive: false,
    style: BADGE_STYLES.default
  }
};

// Steps for the visual progress bar
export const PROGRESS_STEPS = ["Ordered", "Processing", "Shipped", "Delivered"];
