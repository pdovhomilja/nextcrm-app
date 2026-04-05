import { z } from "zod";

export const UpdateProduct = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  sku: z.string().max(100).optional(),
  type: z.enum(["PRODUCT", "SERVICE"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  unit_price: z.string().optional(),
  unit_cost: z.string().optional(),
  currency: z.string().length(3).optional(),
  tax_rate: z.string().optional(),
  unit: z.string().max(50).optional(),
  is_recurring: z.boolean().optional(),
  billing_period: z.enum(["MONTHLY", "QUARTERLY", "ANNUALLY", "ONE_TIME"]).optional().nullable(),
  categoryId: z.string().optional().nullable(),
});
