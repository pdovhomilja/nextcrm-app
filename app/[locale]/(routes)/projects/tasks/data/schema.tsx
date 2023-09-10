import { z } from "zod";

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const taskSchema = z.object({
  id: z.string(),
  content: z.string(),
  taskStatus: z.string().nullable(),
  dueDateAt: z.date().nullable(),
  section: z.string().nullable().optional(),
  priority: z.string(),
});

export type Task = z.infer<typeof taskSchema>;
