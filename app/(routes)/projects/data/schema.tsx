import { z } from "zod";

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  visibility: z.string(),
  assigned_user: z.object({
    name: z.string(),
  }),
});

export type Task = z.infer<typeof taskSchema>;
