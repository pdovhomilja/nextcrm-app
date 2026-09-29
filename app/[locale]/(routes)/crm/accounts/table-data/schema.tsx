import { z } from "zod";

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const accountSchema = z.object({
  //TODO: fix all the types and nullable
  id: z.string(),
  createdAt: z.date().optional(),
  name: z.string(),
  assigned_to_user: z.object({}).nullable().optional(),
  contacts: z
    .array(
      z.object({
        // `first_name` is nullable in the DB (`crm_Contacts.first_name String?`)
        // — a company contact (e.g. one created by a target→opportunity
        // conversion) legitimately has no person first name. `.optional()`
        // alone rejects an explicit `null` and made this row-schema parse throw
        // a ZodError during render (React #419 → "This page couldn't load").
        // `.nullish()` accepts both null and undefined. `last_name` stays
        // required — it is non-null in the DB.
        first_name: z.string().nullish(),
        last_name: z.string(),
      })
    )
    .optional(),
});

export type Account = z.infer<typeof accountSchema>;
