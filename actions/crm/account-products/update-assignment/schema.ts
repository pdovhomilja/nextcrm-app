import { z } from "zod";

export const UpdateAssignment = z.object({
  id: z.string(),
  quantity: z.coerce.number().int().min(1).optional(),
  custom_price: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED", "PENDING"]).optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional().nullable(),
  renewal_date: z.coerce.date().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});
