import { z } from "zod";

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const opportunitySchema = z.object({
  //TODO: fix all the types and nullable
  id: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string(),
  email: z.string().nullable(),
  personal_email: z.string().nullable(),
  office_phone: z.string().nullable(),
  mobile_phone: z.string().nullable(),
  website: z.string().nullable(),
  position: z.string().nullable(),
  status: z.boolean(),
  type: z.string().nullable(),
});

export type Opportunity = z.infer<typeof opportunitySchema>;
