import { z } from "zod";

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const taskSchema = z.object({
  id: z.string(),
  date_created: z.date(),
  date_due: z.date(),
});

export type Task = z.infer<typeof taskSchema>;
