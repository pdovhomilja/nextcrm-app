import { z } from "zod";

export const AssignProduct = z.object({
  accountId: z.string(),
  productId: z.string(),
  quantity: z.coerce.number().int().min(1).default(1),
  custom_price: z.string().optional(),
  currency: z.string().length(3),
  status: z.enum(["ACTIVE", "PENDING"]).default("ACTIVE"),
  start_date: z.coerce.date(),
  end_date: z.coerce.date().optional(),
  renewal_date: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
});
