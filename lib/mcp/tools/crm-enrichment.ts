import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { getApiKey } from "@/lib/api-keys";
import { itemResponse, notFound, externalError } from "../helpers";

export const crmEnrichmentTools = [
  {
    name: "crm_enrich_contact",
    description:
      "Enrich a single contact using Firecrawl + AI. Requires FIRECRAWL and OPENAI API keys configured. Returns enrichment record ID for tracking.",
    schema: z.object({
      contactId: z.string().uuid(),
      fields: z
        .array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
          })
        )
        .min(1),
    }),
    async handler(
      args: { contactId: string; fields: Array<{ name: string; description?: string }> },
      userId: string
    ) {
      const firecrawlKey = await getApiKey("FIRECRAWL", userId);
      const openaiKey = await getApiKey("OPENAI", userId);
      if (!firecrawlKey || !openaiKey) {
        externalError(
          "Missing required API keys (FIRECRAWL and/or OPENAI). Configure them in Settings > API Keys."
        );
      }

      const contact = await prismadb.crm_Contacts.findUnique({
        where: { id: args.contactId },
        select: { id: true, email: true },
      });
      if (!contact) notFound("Contact");
      if (!contact!.email) {
        externalError("Contact has no email. Add an email to enable enrichment.");
      }

      const enrichment = await prismadb.crm_Contact_Enrichment.create({
        data: {
          contactId: args.contactId,
          status: "RUNNING",
          fields: args.fields.map((f) => f.name),
          triggeredBy: userId,
        },
      });

      await inngest.send({
        name: "enrich/contact.run",
        data: {
          contactId: args.contactId,
          enrichmentId: enrichment.id,
          fields: args.fields,
          triggeredBy: userId,
        },
      });

      return itemResponse({ enrichmentId: enrichment.id, status: "RUNNING" });
    },
  },
  {
    name: "crm_enrich_contact_bulk",
    description: "Enrich multiple contacts in bulk (max 100). Dispatches async jobs.",
    schema: z.object({
      contactIds: z.array(z.string().uuid()).min(1).max(100),
      fields: z
        .array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
          })
        )
        .min(1),
    }),
    async handler(
      args: { contactIds: string[]; fields: Array<{ name: string; description?: string }> },
      userId: string
    ) {
      const firecrawlKey = await getApiKey("FIRECRAWL", userId);
      const openaiKey = await getApiKey("OPENAI", userId);
      if (!firecrawlKey || !openaiKey) {
        externalError("Missing required API keys (FIRECRAWL and/or OPENAI).");
      }

      await inngest.send({
        name: "enrich/contacts.bulk",
        data: { contactIds: args.contactIds, fields: args.fields, triggeredBy: userId },
      });

      return itemResponse({ status: "DISPATCHED", count: args.contactIds.length });
    },
  },
  {
    name: "crm_enrich_target",
    description:
      "Enrich a single target using Firecrawl + AI. Requires FIRECRAWL and OPENAI API keys.",
    schema: z.object({
      targetId: z.string().uuid(),
      fields: z
        .array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
          })
        )
        .min(1),
    }),
    async handler(
      args: { targetId: string; fields: Array<{ name: string; description?: string }> },
      userId: string
    ) {
      const firecrawlKey = await getApiKey("FIRECRAWL", userId);
      const openaiKey = await getApiKey("OPENAI", userId);
      if (!firecrawlKey || !openaiKey) {
        externalError("Missing required API keys (FIRECRAWL and/or OPENAI).");
      }

      const target = await prismadb.crm_Targets.findUnique({
        where: { id: args.targetId },
        select: { id: true, email: true },
      });
      if (!target) notFound("Target");
      if (!target!.email) {
        externalError("Target has no email. Add an email to enable enrichment.");
      }

      const enrichment = await prismadb.crm_Target_Enrichment.create({
        data: {
          targetId: args.targetId,
          status: "RUNNING",
          fields: args.fields.map((f) => f.name),
          triggeredBy: userId,
        },
      });

      await inngest.send({
        name: "enrich/target.run",
        data: {
          targetId: args.targetId,
          enrichmentId: enrichment.id,
          fields: args.fields,
          triggeredBy: userId,
        },
      });

      return itemResponse({ enrichmentId: enrichment.id, status: "RUNNING" });
    },
  },
  {
    name: "crm_enrich_target_bulk",
    description: "Enrich multiple targets in bulk (max 100). Dispatches async jobs.",
    schema: z.object({
      targetIds: z.array(z.string().uuid()).min(1).max(100),
      fields: z
        .array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
          })
        )
        .min(1),
    }),
    async handler(
      args: { targetIds: string[]; fields: Array<{ name: string; description?: string }> },
      userId: string
    ) {
      const firecrawlKey = await getApiKey("FIRECRAWL", userId);
      const openaiKey = await getApiKey("OPENAI", userId);
      if (!firecrawlKey || !openaiKey) {
        externalError("Missing required API keys (FIRECRAWL and/or OPENAI).");
      }

      await inngest.send({
        name: "enrich/targets.bulk",
        data: { targetIds: args.targetIds, fields: args.fields, triggeredBy: userId },
      });

      return itemResponse({ status: "DISPATCHED", count: args.targetIds.length });
    },
  },
];
