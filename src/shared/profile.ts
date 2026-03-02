import { z } from "zod";

// --- Zod Schema Definition for Form validation and server function ---
export const userSettingsSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters"),
  last_name: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters"),
  phone_number: z
    .string()
    .trim()
    .refine(
      (val) => val === "" || /^[\d+\-\s()]+$/.test(val),
      "Invalid phone number format"
    )
    .optional(),
  birthday: z.string().optional(),
  currency: z.string().min(1, "Please select a currency"),
  language: z.string().min(1, "Please select a language"),
  notify_order_updates: z.boolean(),
  notify_newsletter: z.boolean(),
  notify_price_changes: z.boolean()
});
