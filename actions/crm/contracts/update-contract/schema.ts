import { z } from "zod";

enum crm_Contracts_Status {
  NOTSTARTED = "NOTSTARTED",
  INPROGRESS = "INPROGRESS",
  SIGNED = "SIGNED",
}

export const UpdateContract = z.object({
  id: z.string(),
  v: z.number(),
  title: z.string().min(1).max(255),
  value: z.string().optional(),
  type: z.string().optional(),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  renewalReminderDate: z.date().optional().nullable(),
  customerSignedDate: z.date().optional().nullable(),
  companySignedDate: z.date().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  status: z.nativeEnum(crm_Contracts_Status).optional(),
  account: z.string().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
});

