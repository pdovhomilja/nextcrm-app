import { z } from "zod";

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const opportunitySchema = z.object({
  //TODO: fix all the types and nullable
  id: z.string(),
  name: z.string(),
  description: z.string(),
  next_step: z.string().nullable(),
  close_date: z.date(),
  status: z.string().nullable(),
  budget: z.number().nullable(),
  expected_revenue: z.number().nullable(),
  assigned_account: z.object({}).optional().nullable(),
  assigned_sales_stage: z.object({}).optional().nullable(),
  assigned_to_user: z.object({}).optional().nullable(),
});

export type Opportunity = z.infer<typeof opportunitySchema>;
