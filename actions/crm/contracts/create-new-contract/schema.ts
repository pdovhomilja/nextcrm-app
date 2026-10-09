import { z } from "zod";

export const CreateNewContract = z.object({
  title: z.string().min(1).max(255),
  value: z.string().optional(),
  type: z.string().optional(),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  renewalReminderDate: z.date().optional().nullable(),
  customerSignedDate: z.date().optional().nullable(),
  companySignedDate: z.date().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  account: z.string().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
});

