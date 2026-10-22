import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { getPublicAppUrl } from "@/lib/app-url";
import { sendPluginNotification } from "@/lib/plugins/notify";
import {
  formatLeadAiDescription,
  qualifyLinkedInLead,
} from "@/lib/linkedin/ai-intelligence";

async function resolveLeadStatusId(name: string): Promise<string | undefined> {
  const row = await prismadb.crm_Lead_Statuses.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  return row?.id;
}

export const linkedInQualifyLead = inngest.createFunction(
  {
    id: "linkedin-qualify-lead",
    name: "LinkedIn: AI qualify lead",
    triggers: [{ event: "linkedin/lead.imported" }],
  },
  async ({ event }) => {
    const { lead_id, raw_payload, actor_user_id } = event.data as {
      lead_id: string;
      raw_payload?: unknown;
      actor_user_id?: string;
    };

    const lead = await prismadb.crm_Leads.findUnique({
      where: { id: lead_id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
        jobTitle: true,
        description: true,
        lead_status_id: true,
      },
    });
    if (!lead) return { skipped: "lead not found" };

    const qualification = await qualifyLinkedInLead({
      lead,
      rawPayload: raw_payload,
      actorUserId: actor_user_id,
    });
    if (!qualification) return { skipped: "ai unavailable" };

    const statusId = await resolveLeadStatusId(qualification.recommendedStatus);
    const description = formatLeadAiDescription(qualification, lead.description);

    await prismadb.crm_Leads.update({
      where: { id: lead_id },
      data: {
        description,
        ...(statusId ? { lead_status_id: statusId } : {}),
      },
    });

    void inngest.send({ name: "crm/lead.saved", data: { record_id: lead_id } });

    if (process.env.LINKEDIN_AUTO_CAMPAIGN_TARGET === "1" && qualification.score >= 78) {
      const existing = await prismadb.crm_Targets.findFirst({
        where: {
          email: lead.email ?? undefined,
          last_name: lead.lastName,
          company: lead.company ?? undefined,
        },
        select: { id: true },
      });
      if (!existing) {
        await prismadb.crm_Targets.create({
          data: {
            first_name: lead.firstName ?? undefined,
            last_name: lead.lastName,
            email: lead.email ?? undefined,
            mobile_phone: lead.phone ?? undefined,
            company: lead.company ?? undefined,
            position: lead.jobTitle ?? undefined,
            created_by: actor_user_id ?? undefined,
          },
        });
      }
    }

    const label = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.company || "Lead";
    const appUrl = getPublicAppUrl();
    void (async () => {
      try {
        await sendPluginNotification("linkedin-leads", {
          roles: ["admin", "manager"],
          subject: `LinkedIn lead (${qualification.tier}, ${qualification.score}): ${label}`,
          text: `${qualification.synopsis}\n\nView: ${appUrl}/en/crm/leads/${lead_id}`,
        });
      } catch (err) {
        console.error("[linkedin-qualify-notify]", err);
      }
    })();

    return { qualified: true, score: qualification.score, tier: qualification.tier };
  }
);
