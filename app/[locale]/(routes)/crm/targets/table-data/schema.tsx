import { z } from "zod";

export const targetSchema = z.object({
  id: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string(),
  email: z.string().nullable(),
  mobile_phone: z.string().nullable(),
  office_phone: z.string().nullable(),
  company: z.string().nullable(),
  position: z.string().nullable(),
  status: z.boolean(),
});

export type Target = z.infer<typeof targetSchema>;
