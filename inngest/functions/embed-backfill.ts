import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";

export const embedBackfill = inngest.createFunction(
  { id: "embed-backfill", name: "Embed Backfill All CRM Records", triggers: [{ event: "crm/backfill.requested" }] },
  async () => {
    const [accounts, contacts, leads, opportunities] = await Promise.all([
      prismadb.crm_Accounts.findMany({ select: { id: true } }),
      prismadb.crm_Contacts.findMany({ select: { id: true } }),
      prismadb.crm_Leads.findMany({ select: { id: true } }),
      prismadb.crm_Opportunities.findMany({ select: { id: true } }),
    ]);

    const events = [
      ...accounts.map((r) => ({ name: "crm/account.saved" as const, data: { record_id: r.id } })),
      ...contacts.map((r) => ({ name: "crm/contact.saved" as const, data: { record_id: r.id } })),
      ...leads.map((r) => ({ name: "crm/lead.saved" as const, data: { record_id: r.id } })),
      ...opportunities.map((r) => ({ name: "crm/opportunity.saved" as const, data: { record_id: r.id } })),
    ];

    if (events.length > 0) {
      await inngest.send(events);
    }

    return {
      dispatched: events.length,
      accounts: accounts.length,
      contacts: contacts.length,
      leads: leads.length,
      opportunities: opportunities.length,
    };
  }
);
