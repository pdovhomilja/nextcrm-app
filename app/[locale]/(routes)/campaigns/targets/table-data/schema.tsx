import { z } from "zod";

export const targetSchema = z.object({
  id: z.string(),
  type: z.enum(["INDIVIDUAL", "COMPANY"]).default("COMPANY"),
  first_name: z.string().nullable().optional(),
  last_name: z.string(),
  email: z.string().nullable(),
  mobile_phone: z.string().nullable(),
  office_phone: z.string().nullable(),
  company: z.string().nullable(),
  company_website: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  position: z.string().nullable(),
  status: z.boolean(),
  triage_status: z.enum(["NEW", "APPROVED", "PASSED"]).default("NEW"),
  pass_reason: z
    .enum(["SCOPE_TOO_LARGE", "NOT_A_FIT", "BAD_TIMING", "ALREADY_MODERN", "OTHER"])
    .nullable()
    .optional(),
  pass_note: z.string().nullable().optional(),
  revisit_at: z.coerce.date().nullable().optional(),
  // Junction rows to target lists, each carrying the list's active status —
  // powers the "List" faceted filter (active lists only). From getTargets().
  target_lists: z
    .array(
      z.object({
        target_list: z
          .object({ id: z.string(), name: z.string(), status: z.boolean() })
          .nullable(),
      })
    )
    .optional(),
  // Minimal outreach-email engagement fields — powers the "Engagement" column +
  // faceted filter (furthest state across all emails). From getTargets().
  target_emails: z
    .array(
      z.object({
        status: z.string().nullable().optional(),
        opened_at: z.coerce.date().nullable().optional(),
        homepage_clicked_at: z.coerce.date().nullable().optional(),
      })
    )
    .optional(),
  // One-to-one generated homepage — powers the "Homepage" column + filter.
  // From getTargets(). current_version_id marks a published page.
  homepage: z
    .object({
      slug: z.string().nullable().optional(),
      status: z.string().nullable().optional(),
      preview_url: z.string().nullable().optional(),
      current_version_id: z.string().nullable().optional(),
      deletedAt: z.coerce.date().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type Target = z.infer<typeof targetSchema>;
