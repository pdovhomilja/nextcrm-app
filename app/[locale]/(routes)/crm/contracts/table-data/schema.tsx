import { z } from "zod";

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const contractsSchema = z.object({
  id: z.string(),
  v: z.number(),
  title: z.string(),
  value: z.number(),
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
  renewalReminderDate: z.date().nullable(),
  customerSignedDate: z.date().nullable(),
  companySignedDate: z.date().nullable(),
  description: z.string().nullable(),
  account: z.string().nullable(),
  assigned_to: z.string().nullable(),
  createdAt: z.date(),
  createdBy: z.string().nullable(),
  updatedAt: z.date(),
  updatedBy: z.string().nullable(),
  status: z.string(),
  type: z.string().nullable(),
  assigned_account: z
    .object({
      name: z.string(),
    })
    .nullable(),
  assigned_to_user: z
    .object({
      name: z.string(),
    })
    .nullable(),
});

export type Lead = z.infer<typeof contractsSchema>;
