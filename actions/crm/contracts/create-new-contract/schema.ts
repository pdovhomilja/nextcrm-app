import { z } from "zod";

export const CreateNewContract = z.object({
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
