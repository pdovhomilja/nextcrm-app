import { z } from "zod";

export const UpdateContractLineItem = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(1).optional(),
  unit_price: z.string().optional(),
  discount_type: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  discount_value: z.string().optional(),
  sort_order: z.coerce.number().int().optional(),
});
