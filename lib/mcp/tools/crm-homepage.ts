// Fork-owned MCP tools for target homepage generation (trigger + status only;
// the generate/critique loop runs in Inngest). Kept in a separate file and
// registered in index.ts so upstream-owned files stay untouched. See CLAUDE.md
// "Additive-first change standard" and docs/reference/UPSTREAM_IMPACT_LOG.md.
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { queueHomepageGeneration, MAX_HOMEPAGE_PROMPT_CHARS } from "@/lib/homepage/queue-generation";
import { itemResponse, notFound, validationError, externalError } from "../helpers";

export const crmHomepageTools = [
  {
    name: "crm_generate_homepage",
    description:
      "Queue generation of a preview homepage for an APPROVED target (regenerates if one already exists). Trigger-only: returns immediately; poll crm_get_homepage_status for progress. Optional prompt steers the design; optional slug sets the preview URL (only for a not-yet-published page).",
    schema: z.object({
      target_id: z.string().uuid(),
      prompt: z.string().max(MAX_HOMEPAGE_PROMPT_CHARS).optional(),
      slug: z.string().max(160).optional(),
    }),
    async handler(args: { target_id: string; prompt?: string; slug?: string }, userId: string) {
      const target = await prismadb.crm_Targets.findFirst({
        where: { id: args.target_id, created_by: userId, deletedAt: null },
        select: { id: true, company: true, company_website: true, triage_status: true },
      });
      if (!target) notFound("Target");
      if (target.triage_status !== "APPROVED") {
        validationError("Target must be approved before generating a homepage");
      }

      const result = await queueHomepageGeneration({
        target: { id: target.id, company: target.company, company_website: target.company_website },
        prompt: args.prompt,
        requestedSlug: args.slug,
        userId,
      });
      if (!result.ok) {
        if (result.code === "QUEUE_FAILED") externalError(result.message);
        validationError(result.message);
      }

      return itemResponse({ queued: true, slug: result.slug, status: "PENDING" });
    },
  },
  {
    name: "crm_get_homepage_status",
    description:
      "Get the homepage generation status for one of your targets: status (PENDING/RUNNING/READY/FAILED), slug, preview_url, screenshot_url, current_version_id, error, and a summary of versions (no HTML).",
    schema: z.object({ target_id: z.string().uuid() }),
    async handler(args: { target_id: string }, userId: string) {
      const homepage = await prismadb.crm_Target_Homepage.findFirst({
        where: {
          targetId: args.target_id,
          deletedAt: null,
          target: { created_by: userId, deletedAt: null },
        },
        select: {
          id: true,
          slug: true,
          status: true,
          error: true,
          preview_url: true,
          screenshot_url: true,
          current_version_id: true,
          updatedAt: true,
          versions: {
            select: { id: true, pass_kind: true, created_at: true, agent_critique: true },
            orderBy: { created_at: "desc" },
            take: 20,
          },
        },
      });
      if (!homepage) notFound("Homepage");
      return itemResponse(homepage);
    },
  },
];
