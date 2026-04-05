import { z } from "zod";

export const CreateProduct = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  sku: z.string().max(100).optional(),
  type: z.enum(["PRODUCT", "SERVICE"]),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  unit_price: z.string(),
  unit_cost: z.string().optional(),
  currency: z.string().length(3),
  tax_rate: z.string().optional(),
  unit: z.string().max(50).optional(),
  is_recurring: z.boolean().default(false),
  billing_period: z.enum(["MONTHLY", "QUARTERLY", "ANNUALLY", "ONE_TIME"]).optional(),
  categoryId: z.string().optional(),
});
