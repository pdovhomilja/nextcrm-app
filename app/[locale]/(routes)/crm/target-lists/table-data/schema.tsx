import { z } from "zod";

export const targetListSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.boolean(),
});

export type TargetList = z.infer<typeof targetListSchema>;
