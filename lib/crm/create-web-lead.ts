import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";

const DEFAULT_LEAD_SOURCE = "Web";
const DEFAULT_LEAD_STATUS = "New";
const DEFAULT_ASSIGNEE_EMAIL = "shaun@radeengineering.com";

export type CreateWebLeadInput = {
  firstName?: string;
  lastName: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  description?: string;
  /** Source *name* (e.g. "Web"); resolved to an id server-side. */
  lead_source?: string;
};

/**
 * Creates a lead from the public web intake endpoint.
 *
 * All relations are resolved here from trusted server-side values — the request
 * only supplies a source *name*, never ids:
 *   - lead source: looked up by name (defaults to "Web"), null if not found
 *   - lead status: always "New", null if not found
 *   - assignee:    the user whose email matches WEB_LEAD_ASSIGNEE_EMAIL
 *                  (defaults to shaun@radeengineering.com), null if not found
 *
 * A missing lookup degrades to null rather than failing the create. After a
 * successful create it fires the same `crm/lead.saved` background event as the
 * authenticated create path. It intentionally sends no "assigned to you" email:
 * the marketing site already notifies the assignee, so that would double-notify.
 */
export async function createWebLead(input: CreateWebLeadInput) {
  const { firstName, lastName, company, jobTitle, email, phone, description } =
    input;

  const sourceName = input.lead_source || DEFAULT_LEAD_SOURCE;
  const assigneeEmail =
    process.env.WEB_LEAD_ASSIGNEE_EMAIL || DEFAULT_ASSIGNEE_EMAIL;

  const [source, status, assignee] = await Promise.all([
    prismadb.crm_Lead_Sources.findUnique({ where: { name: sourceName } }),
    prismadb.crm_Lead_Statuses.findUnique({ where: { name: DEFAULT_LEAD_STATUS } }),
    prismadb.users.findUnique({ where: { email: assigneeEmail } }),
  ]);

  const lead = await prismadb.crm_Leads.create({
    data: {
      v: 1,
      firstName,
      lastName,
      company,
      jobTitle,
      email,
      phone,
      description,
      lead_source_id: source?.id ?? null,
      lead_status_id: status?.id ?? null,
      assigned_to: assignee?.id ?? null,
    },
  });

  void inngest.send({ name: "crm/lead.saved", data: { record_id: lead.id } });

  return lead;
}
