import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { isFieldEmpty } from "@/lib/enrichment/utils/field-utils";
import { getApiKey } from "@/lib/api-keys";
import { getAgentScript } from "@/lib/enrichment/e2b/agent-script";
import { resolveCompanyDomain, filterByConfidence, buildContactUpsertKey, type AgentOutput } from "@/lib/enrichment/e2b/apply-result";
import { parseAgentOutput } from "@/lib/enrichment/e2b/agent-output";
import { Sandbox } from "e2b";
import type { EnrichmentField } from "@/lib/enrichment/types";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const SANDBOX_TIMEOUT_MS = 5 * 60 * 1000;

/** Exported for unit testing. */
export function shouldSkipTargetEnrichment(lastCompletedAt: Date | null): boolean {
  if (!lastCompletedAt) return false;
  return Date.now() - lastCompletedAt.getTime() < SEVEN_DAYS_MS;
}

const TARGET_FIELD_MAP: Record<string, string> = {
  company_website:  "company_website",
  industry:         "industry",
  employees:        "employees",
  city:             "city",
  company_phone:    "company_phone",
  social_linkedin:  "social_linkedin",
  social_x:         "social_x",
  description:      "description",
};

export const enrichTarget = inngest.createFunction(
  {
    id: "enrich-target",
    name: "Enrich Target",
    triggers: [{ event: "enrich/target.run" }],
    retries: 3,
  },
  async ({ event, step }) => {
    const { targetId, enrichmentId: incomingEnrichmentId, triggeredBy, force } = event.data as {
      targetId: string;
      enrichmentId?: string;
      fields?: EnrichmentField[];
      triggeredBy?: string;
      force?: boolean;
    };

    // Create an enrichment log row if one wasn't pre-created by the caller.
    const enrichmentId = await step.run("ensure-enrichment-log", async () => {
      if (incomingEnrichmentId) return incomingEnrichmentId;
      const row = await prismadb.crm_Target_Enrichment.create({
        data: { targetId, status: "RUNNING", triggeredBy: triggeredBy ?? null },
        select: { id: true },
      });
      return row.id;
    });

    // Only whether a key exists goes into step state; the key itself is read
    // again inside the agent step.
    const hasApiKey = await step.run("resolve-api-key", async () =>
      Boolean(await getApiKey("ANTHROPIC", triggeredBy))
    );

    if (!hasApiKey) {
      await prismadb.crm_Target_Enrichment.update({
        where: { id: enrichmentId },
        data: { status: "FAILED", error: "NO_API_KEY: configure ANTHROPIC key in admin or profile settings" },
      });
      return;
    }

    const target = await step.run("load-target", () =>
      prismadb.crm_Targets.findUnique({
        where: { id: targetId },
        select: {
          id: true, first_name: true, last_name: true,
          email: true, company: true, company_website: true,
          industry: true, employees: true, city: true,
          company_phone: true, social_linkedin: true, social_x: true, description: true,
        },
      })
    );

    if (!target?.company && !target?.email) {
      await prismadb.crm_Target_Enrichment.update({
        where: { id: enrichmentId },
        data: { status: "SKIPPED", error: "No email or company on target" },
      });
      return { skipped: "no email or company" };
    }

    const recentEnrichment = await prismadb.crm_Target_Enrichment.findFirst({
      where: { targetId, status: "COMPLETED", createdAt: { gte: new Date(Date.now() - SEVEN_DAYS_MS) } },
      select: { createdAt: true },
    });

    if (!force && shouldSkipTargetEnrichment(recentEnrichment?.createdAt ?? null)) {
      await prismadb.crm_Target_Enrichment.update({
        where: { id: enrichmentId },
        data: { status: "SKIPPED", error: "Enriched within last 7 days" },
      });
      return { skipped: "recently enriched" };
    }

    await prismadb.crm_Target_Enrichment.update({
      where: { id: enrichmentId },
      data: { status: "RUNNING" },
    });

    const agentOutput = await step.run("run-e2b-agent", async (): Promise<AgentOutput> => {
      const knownDomain = resolveCompanyDomain({
        companyWebsite: target.company_website ?? null,
        email: target.email ?? null,
        companyName: target.company ?? "",
      });

      const anthropicKey = await getApiKey("ANTHROPIC", triggeredBy);
      if (!anthropicKey) throw new Error("NO_API_KEY");

      const script = getAgentScript();

      const sandbox = await Sandbox.create(
        process.env.E2B_ENRICHMENT_TEMPLATE ?? "nextcrm-enrichment",
        {
          timeoutMs: SANDBOX_TIMEOUT_MS,
          apiKey: process.env.E2B_API_KEY,
        }
      );

      try {
        await sandbox.files.write("/home/user/agent.mjs", script);
        let result: { exitCode: number; stdout: string; stderr: string };
        try {
          result = await sandbox.commands.run("node /home/user/agent.mjs", {
            timeoutMs: 0, // no per-request timeout; sandbox-level timeout handles the limit
            envs: {
              ANTHROPIC_API_KEY: anthropicKey,
              COMPANY_NAME: target.company ?? "",
              COMPANY_WEBSITE: target.company_website ?? "",
              TARGET_EMAIL: target.email ?? "",
              TARGET_NAME: [target.first_name, target.last_name].filter(Boolean).join(" "),
              KNOWN_DOMAIN: knownDomain ?? "",
            },
          });
        } catch (cmdErr: unknown) {
          const e = cmdErr as Record<string, unknown>;
          throw new Error(`Agent failed: ${e["stderr"] ?? e["stdout"] ?? String(cmdErr)}`);
        }

        if (result.exitCode !== 0) {
          throw new Error(`Agent exited ${result.exitCode}: ${result.stderr || result.stdout}`);
        }

        return parseAgentOutput(result.stdout);
      } finally {
        await sandbox.kill().catch(() => {});
      }
    });

    await step.run("apply-target-fields", async () => {
      const filtered = filterByConfidence(agentOutput.target, agentOutput.confidence);
      const updates: Record<string, string> = {};

      for (const [agentKey, value] of Object.entries(filtered)) {
        const dbColumn = TARGET_FIELD_MAP[agentKey];
        if (!dbColumn || !value) continue;
        const current = (target as unknown as Record<string, string | null>)[dbColumn];
        if (isFieldEmpty(current)) updates[dbColumn] = value;
      }

      if (Object.keys(updates).length > 0) {
        await prismadb.crm_Targets.update({ where: { id: targetId }, data: updates });
      }
      return { applied: Object.keys(updates) };
    });

    const contactIds = await step.run("upsert-contacts", async () => {
      const ids: string[] = [];
      for (const contact of agentOutput.contacts ?? []) {
        if (!contact.email && !contact.linkedinUrl) continue;
        const whereKey = buildContactUpsertKey(targetId, contact);
        const complete = Boolean(contact.title && contact.linkedinUrl);
        // An existing contact keeps its values; the agent only fills empty fields.
        const row = await prismadb.crm_Target_Contact.upsert({
          where: whereKey as Parameters<typeof prismadb.crm_Target_Contact.upsert>[0]["where"],
          create: {
            targetId,
            name: contact.name,
            email: contact.email,
            title: contact.title,
            linkedinUrl: contact.linkedinUrl,
            phone: contact.phone,
            source: "enriched",
            enrichStatus: complete ? "COMPLETED" : "PENDING",
            enrichedAt: complete ? new Date() : null,
          },
          update: {},
          select: { id: true, name: true, title: true, linkedinUrl: true, enrichStatus: true },
        });

        const fills: Record<string, string> = {};
        for (const key of ["name", "title", "linkedinUrl"] as const) {
          const v = contact[key];
          if (v && isFieldEmpty(row[key])) fills[key] = v;
        }
        const merged = { ...row, ...fills };
        const status = merged.title && merged.linkedinUrl ? "COMPLETED" : "PENDING";
        if (Object.keys(fills).length > 0 || status !== row.enrichStatus) {
          await prismadb.crm_Target_Contact.update({
            where: { id: row.id },
            data: { ...fills, enrichStatus: status, enrichedAt: status === "COMPLETED" ? new Date() : null },
          });
        }
        if (status === "PENDING") ids.push(row.id);
      }
      return ids;
    });

    if (contactIds.length > 0) {
      await step.sendEvent(
        "fan-out-contact-enrichment",
        contactIds.map((contactId) => ({
          name: "enrich/target.contact.run",
          data: { contactId, triggeredBy },
        }))
      );
    }

    await prismadb.crm_Target_Enrichment.update({
      where: { id: enrichmentId },
      data: { status: "COMPLETED" },
    });

    return { enriched: true, contactsFound: agentOutput.contacts?.length ?? 0 };
  }
);
