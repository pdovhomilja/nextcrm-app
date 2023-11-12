import { z } from "zod";

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const accountSchema = z.object({
  //TODO: fix all the types and nullable
  id: z.string(),
  createdAt: z.date().optional(),
  name: z.string(),
  assigned_to_user: z.object({}).optional(),
  contacts: z
    .array(
      z.object({
        first_name: z.string().optional(),
        last_name: z.string(),
      })
    )
    .optional(),
});

export type Account = z.infer<typeof accountSchema>;
