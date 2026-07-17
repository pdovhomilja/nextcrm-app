import { z } from "zod";

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
// Display schema — must mirror what the DB can actually hold, not entry
// validation: dates are nullable columns, and lastName has no length
// constraint (2-char surnames and long names are valid data).
export const leadSchema = z.object({
  id: z.string(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string(),
});

export type Lead = z.infer<typeof leadSchema>;
