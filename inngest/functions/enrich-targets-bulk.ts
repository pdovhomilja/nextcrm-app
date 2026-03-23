import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import type { EnrichmentField } from "@/lib/enrichment/types";

export const enrichTargetsBulk = inngest.createFunction(
  {
    id: "enrich-targets-bulk",
    name: "Enrich Targets Bulk",
    triggers: [{ event: "enrich/targets.bulk" }],
  },
  async ({ event, step }) => {
    const { targetIds, fields, triggeredBy } = event.data as {
      targetIds: string[];
      fields: EnrichmentField[];
      triggeredBy?: string;
    };

    const records = await step.run("create-enrichment-records", async () => {
      const created = await Promise.all(
        targetIds.map((targetId) =>
          prismadb.crm_Target_Enrichment.create({
            data: {
              targetId,
              status: "PENDING",
              fields: fields.map((f) => f.name),
              triggeredBy: triggeredBy ?? null,
            },
            select: { id: true, targetId: true },
          })
        )
      );
      return created;
    });

    await step.sendEvent(
      "fan-out-target-enrichments",
      records.map((r: { id: string; targetId: string }) => ({
        name: "enrich/target.run",
        data: { targetId: r.targetId, enrichmentId: r.id, fields },
      }))
    );

    return { dispatched: records.length };
  }
);
