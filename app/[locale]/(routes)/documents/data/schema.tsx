import { z } from "zod";

export const documentSchema = z.object({
  id: z.string(),
  document_name: z.string(),
  document_file_url: z.string(),
  document_file_mimeType: z.string(),
  description: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  thumbnail_url: z.string().nullable().optional(),
  processing_status: z.enum(["PENDING", "PROCESSING", "READY", "FAILED"]),
  document_system_type: z.enum(["RECEIPT", "CONTRACT", "OFFER", "OTHER"]).nullable().optional(),
  content_hash: z.string().nullable().optional(),
  version: z.number(),
  parent_document_id: z.string().nullable().optional(),
  createdAt: z.date().nullable().optional(),
  assigned_to_user: z.object({
    name: z.string().nullable(),
  }).nullable().optional(),
  accounts: z.array(z.object({
    account: z.object({
      id: z.string(),
      name: z.string(),
    }),
  })).optional(),
});

export type DocumentRow = z.infer<typeof documentSchema>;

// Keep backward compat alias
export const taskSchema = documentSchema;
export type Task = DocumentRow;
