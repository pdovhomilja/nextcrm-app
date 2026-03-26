import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { getApiKey } from "@/lib/api-keys";
import { getAgentScript } from "@/lib/enrichment/e2b/agent-script";
import { resolveCompanyDomain, type AgentOutput } from "@/lib/enrichment/e2b/apply-result";
import { isFieldEmpty } from "@/lib/enrichment/utils/field-utils";
import { Sandbox } from "e2b";

const SANDBOX_TIMEOUT_MS = 5 * 60 * 1000;

export const enrichTargetContact = inngest.createFunction(
  {
    id: "enrich-target-contact",
    name: "Enrich Target Contact",
    triggers: [{ event: "enrich/target.contact.run" }],
    retries: 2,
  },
  async ({ event, step }) => {
    const { contactId, triggeredBy } = event.data as {
      contactId: string;
      triggeredBy?: string;
    };

    const contact = await step.run("load-contact", () =>
      prismadb.crm_Target_Contact.findUnique({
        where: { id: contactId },
        select: {
          id: true, name: true, email: true, title: true, linkedinUrl: true, phone: true,
          target: {
            select: { company: true, company_website: true, email: true },
          },
        },
      })
    );

    if (!contact) return { skipped: "contact not found" };

    const skipReason = await step.run("check-already-enriched", async () => {
      if (!contact.title || !contact.linkedinUrl) return null;
      await prismadb.crm_Target_Contact.update({
        where: { id: contactId },
        data: { enrichStatus: "COMPLETED", enrichedAt: new Date() },
      });
      return "already enriched";
    });
    if (skipReason) return { skipped: skipReason };

    const anthropicKey = await step.run("resolve-api-key", () =>
      getApiKey("ANTHROPIC", triggeredBy)
    );

    if (!anthropicKey) {
      await prismadb.crm_Target_Contact.update({
        where: { id: contactId },
        data: { enrichStatus: "FAILED" },
      });
      return;
    }

    await step.run("mark-running", () =>
      prismadb.crm_Target_Contact.update({
        where: { id: contactId },
        data: { enrichStatus: "RUNNING" },
      })
    );

    const agentOutput = await step.run("run-e2b-agent", async (): Promise<AgentOutput> => {
      const knownDomain = resolveCompanyDomain({
        companyWebsite: contact.target.company_website ?? null,
        email: contact.email ?? contact.target.email ?? null,
        companyName: contact.target.company ?? "",
      });

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
        const result = await sandbox.commands.run("node /home/user/agent.mjs", {
          envs: {
            ANTHROPIC_API_KEY: anthropicKey,
            COMPANY_NAME: contact.target.company ?? "",
            COMPANY_WEBSITE: contact.target.company_website ?? "",
            TARGET_EMAIL: contact.email ?? contact.target.email ?? "",
            TARGET_NAME: contact.name ?? "",
            KNOWN_DOMAIN: knownDomain ?? "",
          },
        });

        if (result.exitCode !== 0) {
          throw new Error(`Agent exited ${result.exitCode}: ${result.stderr}`);
        }

        return JSON.parse(result.stdout) as AgentOutput;
      } finally {
        await sandbox.kill().catch(() => {});
      }
    });

    await step.run("apply-contact-fields", async () => {
      const personData = (agentOutput.contacts ?? []).find(
        (c) =>
          c.name &&
          contact.name &&
          c.name.toLowerCase().includes(
            (contact.name.split(" ")[0] ?? "").toLowerCase()
          )
      );

      const updates: Record<string, unknown> = {};
      if (isFieldEmpty(contact.title) && personData?.title) updates.title = personData.title;
      if (isFieldEmpty(contact.linkedinUrl) && personData?.linkedinUrl) updates.linkedinUrl = personData.linkedinUrl;
      if (isFieldEmpty(contact.phone) && personData?.phone) updates.phone = personData.phone;

      updates.enrichStatus = "COMPLETED";
      updates.enrichedAt = new Date();

      await prismadb.crm_Target_Contact.update({ where: { id: contactId }, data: updates });
      return { applied: Object.keys(updates) };
    });

    return { enriched: true };
  }
);
