import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import type { EnrichmentField } from "@/lib/enrichment/types";

export const enrichContactsBulk = inngest.createFunction(
  {
    id: "enrich-contacts-bulk",
    name: "Enrich Contacts Bulk",
    triggers: [{ event: "enrich/contacts.bulk" }],
  },
  async ({ event, step }) => {
    const { contactIds, fields, triggeredBy } = event.data as {
      contactIds: string[];
      fields: EnrichmentField[];
      triggeredBy?: string;
    };

    // Create one enrichment record per contact
    const records = await step.run("create-enrichment-records", async () => {
      const created = await Promise.all(
        contactIds.map((contactId) =>
          prismadb.crm_Contact_Enrichment.create({
            data: {
              contactId,
              status: "PENDING",
              fields: fields.map((f) => f.name),
              triggeredBy: triggeredBy ?? null,
            },
            select: { id: true, contactId: true },
          })
        )
      );
      return created;
    });

    // Fan out: one event per contact
    await step.sendEvent(
      "fan-out-enrichments",
      records.map((r: { id: string; contactId: string }) => ({
        name: "enrich/contact.run",
        data: { contactId: r.contactId, enrichmentId: r.id, fields },
      }))
    );

    return { dispatched: records.length };
  }
);
