import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { AgentEnrichmentStrategy } from "@/lib/enrichment/strategies/agent-enrichment-strategy";
import { isFieldEmpty } from "@/lib/enrichment/utils/field-utils";
import { getApiKey } from "@/lib/api-keys";
import type { EnrichmentField } from "@/lib/enrichment/types";
import type { StoredEnrichmentResult } from "@/lib/enrichment/types/stored-result";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Exported for unit testing.
 * Returns true if a contact was successfully enriched within the last 7 days.
 */
export function shouldSkipBulkEnrichment(lastCompletedAt: Date | null): boolean {
  if (!lastCompletedAt) return false;
  return Date.now() - lastCompletedAt.getTime() < SEVEN_DAYS_MS;
}

const contactFieldMap = {
  position: "position",
  website: "website",
  social_linkedin: "social_linkedin",
  social_twitter: "social_twitter",
  social_facebook: "social_facebook",
  social_instagram: "social_instagram",
  description: "description",
  office_phone: "office_phone",
  mobile_phone: "mobile_phone",
} as const;

export const enrichContact = inngest.createFunction(
  {
    id: "enrich-contact",
    name: "Enrich Contact",
    triggers: [{ event: "enrich/contact.run" }],
    retries: 3,
  },
  async ({ event }) => {
    const { contactId, enrichmentId, fields, triggeredBy } = event.data as {
      contactId: string;
      enrichmentId: string;
      fields: EnrichmentField[];
      triggeredBy?: string;
    };

    const firecrawlApiKey = await getApiKey("FIRECRAWL", triggeredBy);
    const openaiApiKey = await getApiKey("OPENAI", triggeredBy);

    if (!firecrawlApiKey || !openaiApiKey) {
      await prismadb.crm_Contact_Enrichment.update({
        where: { id: enrichmentId },
        data: { status: "FAILED", error: "NO_API_KEY: configure keys in admin or profile settings" },
      });
      return;
    }

    // Mark as running
    await prismadb.crm_Contact_Enrichment.update({
      where: { id: enrichmentId },
      data: { status: "RUNNING" },
    });

    // Fetch contact
    const contact = await prismadb.crm_Contacts.findUnique({
      where: { id: contactId },
      select: {
        id: true,
        email: true,
        position: true,
        website: true,
        social_linkedin: true,
        social_twitter: true,
        social_facebook: true,
        social_instagram: true,
        description: true,
        office_phone: true,
        mobile_phone: true,
      },
    });

    if (!contact?.email) {
      await prismadb.crm_Contact_Enrichment.update({
        where: { id: enrichmentId },
        data: { status: "SKIPPED", error: "No email on contact" },
      });
      return { skipped: "no email" };
    }

    // 7-day dedup check
    const recentEnrichment = await prismadb.crm_Contact_Enrichment.findFirst({
      where: {
        contactId,
        status: "COMPLETED",
        createdAt: { gte: new Date(Date.now() - SEVEN_DAYS_MS) },
      },
      select: { createdAt: true },
    });

    if (shouldSkipBulkEnrichment(recentEnrichment?.createdAt ?? null)) {
      await prismadb.crm_Contact_Enrichment.update({
        where: { id: enrichmentId },
        data: { status: "SKIPPED", error: "Enriched within last 7 days" },
      });
      return { skipped: "recently enriched" };
    }

    // Run enrichment
    const strategy = new AgentEnrichmentStrategy(openaiApiKey!, firecrawlApiKey!);
    const result = await strategy.enrichRow(
      { email: contact.email },
      fields,
      "email"
    );

    const stored: StoredEnrichmentResult = {
      enrichments: result.enrichments,
      status: result.status as "completed" | "error" | "skipped",
      error: result.error,
    };

    // Apply only to empty fields
    const updates: Record<string, string> = {};
    for (const [fieldName, enrichment] of Object.entries(result.enrichments)) {
      const contactColumn = contactFieldMap[fieldName as keyof typeof contactFieldMap];
      if (!contactColumn) continue;
      const currentValue = contact[contactColumn] as string | null;
      if (isFieldEmpty(currentValue) && enrichment.value) {
        updates[contactColumn] = String(enrichment.value);
      }
    }

    if (Object.keys(updates).length > 0) {
      await prismadb.crm_Contacts.update({
        where: { id: contactId },
        data: updates,
      });
    }

    await prismadb.crm_Contact_Enrichment.update({
      where: { id: enrichmentId },
      data: { status: "COMPLETED", result: stored as object },
    });

    return { enriched: true, fieldsApplied: Object.keys(updates) };
  }
);
