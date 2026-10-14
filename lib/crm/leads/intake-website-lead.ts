import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { sendPluginNotification } from "@/lib/plugins/notify";
import { getPublicAppUrl } from "@/lib/app-url";
import {
  buildWebsiteLeadDescription,
  splitPersonName,
  type WebsiteLeadIntakeInput,
} from "@/lib/crm/leads/website-intake-schema";

export type IntakeWebsiteLeadResult =
  | { ok: true; leadId: string; created: boolean }
  | { ok: false; error: string; status: number; fields?: Record<string, string[]> };

async function resolveNewLeadStatusId(): Promise<string | undefined> {
  const row = await prismadb.crm_Lead_Statuses.findFirst({
    where: { name: { equals: "New", mode: "insensitive" } },
    select: { id: true },
  });
  return row?.id;
}

async function resolveAccountIdFromContactEmail(email: string): Promise<string | undefined> {
  const normalized = email.trim().toLowerCase();
  const contact = await prismadb.crm_Contacts.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { email: { equals: normalized, mode: "insensitive" } },
        { personal_email: { equals: normalized, mode: "insensitive" } },
      ],
    },
    select: { accountsIDs: true },
    orderBy: { updatedAt: "desc" },
  });
  return contact?.accountsIDs ?? undefined;
}

export async function intakeWebsiteLead(
  input: WebsiteLeadIntakeInput
): Promise<IntakeWebsiteLeadResult> {
  const existing = await prismadb.crm_Leads.findFirst({
    where: { externalId: input.externalId, deletedAt: null },
    select: { id: true },
  });
  if (existing) {
    return { ok: true, leadId: existing.id, created: false };
  }

  const { firstName, lastName } = splitPersonName(input.name);
  const leadStatusId = await resolveNewLeadStatusId();
  const accountsIDs = await resolveAccountIdFromContactEmail(input.email);
  const submittedAt = new Date(input.submittedAt);
  const createdAt = Number.isNaN(submittedAt.getTime()) ? undefined : submittedAt;

  try {
    const lead = await prismadb.crm_Leads.create({
      data: {
        v: 1,
        externalId: input.externalId,
        firstName,
        lastName,
        company: input.company,
        email: input.email.trim().toLowerCase(),
        phone: input.phone,
        description: buildWebsiteLeadDescription(input),
        refered_by: input.source,
        campaign: input.source,
        lead_status_id: leadStatusId,
        accountsIDs,
        assigned_to: undefined,
        createdAt,
      },
      select: { id: true, firstName: true, lastName: true, company: true },
    });

    void inngest.send({ name: "crm/lead.saved", data: { record_id: lead.id } });

    const appUrl = getPublicAppUrl();
    const label = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.company || "Lead";
    void (async () => {
      try {
        await sendPluginNotification("website-leads", {
          roles: ["admin", "manager"],
          subject: `New website lead: ${label}`,
          text: `${label} from ${input.company} (${input.email})\n\nView: ${appUrl}/en/crm/leads/${lead.id}`,
        });
      } catch (err) {
        console.error("[website-lead-notify]", err);
      }
    })();

    return { ok: true, leadId: lead.id, created: true };
  } catch (error) {
    const prismaCode =
      error && typeof error === "object" && "code" in error
        ? (error as { code: string }).code
        : undefined;
    if (prismaCode === "P2002") {
      const dup = await prismadb.crm_Leads.findFirst({
        where: { externalId: input.externalId },
        select: { id: true },
      });
      if (dup) return { ok: true, leadId: dup.id, created: false };
    }
    console.error("[intakeWebsiteLead]", error);
    return { ok: false, error: "Internal error", status: 500 };
  }
}
