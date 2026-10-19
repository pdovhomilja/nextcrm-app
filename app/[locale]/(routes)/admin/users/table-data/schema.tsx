import { z } from "zod";

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const adminUserSchema = z.object({
  //TODO: fix all the types and nullable
  id: z.string(),
  created_on: z.date(),
  lastLoginAt: z.date().nullable().optional(),
  role: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  email: z.string(),
  workEmail: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  userStatus: z.string(),
  userLanguage: z.string(),
  crmEnabled: z.boolean().optional(),
  ventureGrants: z
    .array(z.object({ ventureSlug: z.string() }))
    .optional(),
});

export type AdminUser = z.infer<typeof adminUserSchema>;
