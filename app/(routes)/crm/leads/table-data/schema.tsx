import { z } from "zod";

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const leadSchema = z.object({
  //TODO: fix all the types and nullable
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  date_modify: z.date(),
  firstName: z.string(),
  lastName: z.string().min(3).max(30).nonempty(),
});

export type Lead = z.infer<typeof leadSchema>;
