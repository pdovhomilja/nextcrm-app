import { z } from "zod";

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const taskSchema = z.object({
  id: z.string(),
  document_name: z.string(),
  document_file_url: z.string(),
  document_file_mimeType: z.string(),
  /*   assigned_to_user: z.object({
    name: z.string(),
  }), */
});

export type Task = z.infer<typeof taskSchema>;
