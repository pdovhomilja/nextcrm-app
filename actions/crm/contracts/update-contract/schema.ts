import { z } from "zod";

export const UpdateContract = z.object({
  id: z.string(),
  v: z.number(),
  title: z.string().min(3).max(255),
  value: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  renewalReminderDate: z.date(),
  customerSignedDate: z.date(),
  companySignedDate: z.date(),
  description: z.string().max(255),
  account: z.string(),
  assigned_to: z.string(),
});
