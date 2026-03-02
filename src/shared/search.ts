import { z } from "zod";

export const defaultValues = {
  q: "",
  categories: [],
  companies: [],
  order: "popularity",
  dir: "desc" as const,
  custom_fields: {},
  limit: 24,
  offset: 0
};

export const productSearchSchema = z.object({
  q: z.string().optional().catch(defaultValues.q),
  categories: z
    .array(z.number().int())
    .optional()
    .catch(defaultValues.categories),
  companies: z
    .array(z.number().int())
    .optional()
    .catch(defaultValues.companies),
  price_min: z.string().min(4).optional(),
  price_max: z.string().min(4).optional(),
  order: z.string().optional().catch(defaultValues.order),
  dir: z.enum(["asc", "desc"]).optional().catch(defaultValues.dir),
  custom_fields: z
    .record(z.string(), z.json().optional())
    .optional()
    .catch(defaultValues.custom_fields),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .catch(defaultValues.limit),
  offset: z.coerce.number().int().min(0).optional().catch(defaultValues.offset)
});

export type ProductSearch = z.infer<typeof productSearchSchema>;
