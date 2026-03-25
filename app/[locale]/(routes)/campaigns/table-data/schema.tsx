import { z } from "zod";

export const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string().nullable(),
  scheduled_at: z.date().nullable(),
  sent_at: z.date().nullable(),
  created_on: z.date().nullable(),
  _count: z.object({ sends: z.number() }).optional(),
  template: z.object({ name: z.string() }).nullable().optional(),
});

export type Campaign = z.infer<typeof campaignSchema>;
