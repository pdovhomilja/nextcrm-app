import { z } from "zod";

export const AddContractLineItem = z.object({
  contractId: z.string(),
  productId: z.string().optional(),
  name: z.string().min(1).max(255),
  sku: z.string().optional(),
  description: z.string().optional(),
  quantity: z.coerce.number().int().min(1).default(1),
  unit_price: z.string(),
  discount_type: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  discount_value: z.string().default("0"),
  sort_order: z.coerce.number().int().default(0),
});
