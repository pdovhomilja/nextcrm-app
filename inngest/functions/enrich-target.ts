import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { AgentEnrichmentStrategy } from "@/lib/enrichment/strategies/agent-enrichment-strategy";
import { isFieldEmpty } from "@/lib/enrichment/utils/field-utils";
import { getApiKey } from "@/lib/api-keys";
import type { EnrichmentField } from "@/lib/enrichment/types";
import type { StoredEnrichmentResult } from "@/lib/enrichment/types/stored-result";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Exported for unit testing. */
export function shouldSkipTargetEnrichment(lastCompletedAt: Date | null): boolean {
  if (!lastCompletedAt) return false;
  return Date.now() - lastCompletedAt.getTime() < SEVEN_DAYS_MS;
}

const targetFieldMap = {
  position:         "position",
  company:          "company",
  company_website:  "company_website",
  personal_website: "personal_website",
  mobile_phone:     "mobile_phone",
  office_phone:     "office_phone",
  social_linkedin:  "social_linkedin",
  social_x:         "social_x",
  social_instagram: "social_instagram",
  social_facebook:  "social_facebook",
} as const;

export const enrichTarget = inngest.createFunction(
  {
    id: "enrich-target",
    name: "Enrich Target",
    triggers: [{ event: "enrich/target.run" }],
    retries: 3,
  },
  async ({ event }) => {
    const { targetId, enrichmentId, fields, triggeredBy } = event.data as {
      targetId: string;
      enrichmentId: string;
      fields: EnrichmentField[];
      triggeredBy?: string;
    };

    const firecrawlApiKey = await getApiKey("FIRECRAWL", triggeredBy);
    const openaiApiKey = await getApiKey("OPENAI", triggeredBy);

    if (!firecrawlApiKey || !openaiApiKey) {
      await prismadb.crm_Target_Enrichment.update({
        where: { id: enrichmentId },
        data: { status: "FAILED", error: "NO_API_KEY: configure keys in admin or profile settings" },
      });
      return;
    }

    await prismadb.crm_Target_Enrichment.update({
      where: { id: enrichmentId },
      data: { status: "RUNNING" },
    });

    const target = await prismadb.crm_Targets.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        email: true,
        position: true,
        company: true,
        company_website: true,
        personal_website: true,
        mobile_phone: true,
        office_phone: true,
        social_linkedin: true,
        social_x: true,
        social_instagram: true,
        social_facebook: true,
      },
    });

    if (!target?.email && !target?.company) {
      await prismadb.crm_Target_Enrichment.update({
        where: { id: enrichmentId },
        data: { status: "SKIPPED", error: "No email or company on target" },
      });
      return { skipped: "no email or company" };
    }

    const recentEnrichment = await prismadb.crm_Target_Enrichment.findFirst({
      where: {
        targetId,
        status: "COMPLETED",
        createdAt: { gte: new Date(Date.now() - SEVEN_DAYS_MS) },
      },
      select: { createdAt: true },
    });

    if (shouldSkipTargetEnrichment(recentEnrichment?.createdAt ?? null)) {
      await prismadb.crm_Target_Enrichment.update({
        where: { id: enrichmentId },
        data: { status: "SKIPPED", error: "Enriched within last 7 days" },
      });
      return { skipped: "recently enriched" };
    }

    try {
      const strategy = new AgentEnrichmentStrategy(openaiApiKey!, firecrawlApiKey!);

      const result = await strategy.enrichRow(
        { email: target.email ?? '' },
        fields,
        "email",
        undefined,
        undefined,
        {
          companyName: target.company ?? undefined,
          companyWebsite: target.company_website ?? undefined,
        }
      );

      const stored: StoredEnrichmentResult = {
        enrichments: result.enrichments,
        status: result.status as "completed" | "error" | "skipped",
        error: result.error,
      };

      const updates: Record<string, string> = {};
      for (const [fieldName, enrichment] of Object.entries(result.enrichments)) {
        const targetColumn = targetFieldMap[fieldName as keyof typeof targetFieldMap];
        if (!targetColumn) continue;
        const currentValue = target[targetColumn] as string | null;
        if (isFieldEmpty(currentValue) && enrichment.value) {
          updates[targetColumn] = String(enrichment.value);
        }
      }

      if (Object.keys(updates).length > 0) {
        await prismadb.crm_Targets.update({
          where: { id: targetId },
          data: updates,
        });
      }

      await prismadb.crm_Target_Enrichment.update({
        where: { id: enrichmentId },
        data: { status: "COMPLETED", result: stored as object },
      });

      return { enriched: true, fieldsApplied: Object.keys(updates) };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await prismadb.crm_Target_Enrichment.update({
        where: { id: enrichmentId },
        data: { status: "FAILED", error: message },
      }).catch(() => {});
      throw err; // re-throw so Inngest retries
    }
  }
);
