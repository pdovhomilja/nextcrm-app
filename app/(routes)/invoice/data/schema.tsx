import { z } from "zod";

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const taskSchema = z.object({
  id: z.string(),
  date_created: z.date(),
  date_due: z.date().nullable(),
  invoice_amount: z.string().nullable(),
  invoice_currency: z.string().nullable(),
  partner: z.string().nullable(),
  invoice_file_mimeType: z.string(),
  invoice_file_url: z.string(),
  status: z.string(),
  rossum_status: z.string().nullable(),
  rossum_annotation_id: z.string().nullable(),
  rossum_annotation_json_url: z.string().nullable(),
  money_s3_url: z.string().nullable(),
});

export type Task = z.infer<typeof taskSchema>;
