import { z } from "zod";

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const contractsSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  customerSignedDate: z.date().nullable(),
  assigned_to_user: z.object({
    name: z.string(),
  }),
  assigned_account: z.object({
    name: z.string(),
  }),
});

export type Lead = z.infer<typeof contractsSchema>;
