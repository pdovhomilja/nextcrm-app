// Fork-owned MCP tools for target homepage generation (trigger + status only;
// the generate/critique loop runs in Inngest). Kept in a separate file and
// registered in index.ts so upstream-owned files stay untouched. See CLAUDE.md
// "Additive-first change standard" and docs/reference/UPSTREAM_IMPACT_LOG.md.
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import { ensureUniqueSlug, slugify } from "@/lib/homepage/slug";
import { itemResponse, notFound, validationError, externalError } from "../helpers";

/**
 * Resolve the homepage slug (mirrors the web generate route). An explicit slug
 * wins; otherwise derive from the company name. A blank/all-symbol company
 * slugifies to "", so fall back to a slug derived from the target id.
 */
async function resolveSlug(targetId: string, company: string | null, requested?: string) {
  const candidates = [requested, company ?? "", `site-${targetId.slice(0, 8)}`];
  for (const c of candidates) {
    if (c && slugify(c)) return ensureUniqueSlug(c);
  }
  return ensureUniqueSlug(`site-${targetId.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "page"}`);
}

export const crmHomepageTools = [
  {
    name: "crm_generate_homepage",
    description:
      "Queue generation of a preview homepage for an APPROVED target (regenerates if one already exists). Trigger-only: returns immediately; poll crm_get_homepage_status for progress. Optional prompt steers the design; optional slug sets the preview URL (only for a not-yet-published page).",
    schema: z.object({
      target_id: z.string().uuid(),
      prompt: z.string().optional(),
      slug: z.string().optional(),
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

      const prompt = args.prompt?.trim() ? args.prompt.trim() : undefined;
      const requestedSlug = args.slug?.trim() ? args.slug : undefined;

      // The row MUST exist before the event is sent: the job looks it up by
      // targetId and silently skips when there is none.
      const existing = await prismadb.crm_Target_Homepage.findUnique({
        where: { targetId: target.id },
        select: { id: true, slug: true, preview_url: true, current_version_id: true },
      });
      const baseData = {
        status: "PENDING" as const,
        base_prompt: prompt ?? null,
        source_url: target.company_website ?? null,
        error: null,
        deletedAt: null,
      };

      let homepageId: string;
      let slug: string;
      try {
        if (existing) {
          const data: typeof baseData & { slug?: string } = { ...baseData };
          const wanted = requestedSlug ? slugify(requestedSlug) : "";
          if (wanted && wanted !== existing.slug) {
            // Renaming only edits the DB row; published objects stay under the
            // old slug, so a rename would 404 a live (possibly emailed) link.
            if (existing.preview_url || existing.current_version_id) {
              validationError(
                "This page is already published; its URL can't be changed. Omit slug to regenerate."
              );
            }
            data.slug = await ensureUniqueSlug(requestedSlug as string);
          }
          await prismadb.crm_Target_Homepage.update({ where: { id: existing.id }, data });
          homepageId = existing.id;
          slug = data.slug ?? existing.slug;
        } else {
          slug = await resolveSlug(target.id, target.company, requestedSlug);
          const created = await prismadb.crm_Target_Homepage.create({
            data: { ...baseData, targetId: target.id, slug, created_by: userId },
          });
          homepageId = created.id;
        }
      } catch (e) {
        // ensureUniqueSlug is check-then-write; a concurrent request can collide.
        if ((e as { code?: string })?.code === "P2002") {
          validationError("Slug or homepage already exists; retry");
        }
        throw e;
      }

      try {
        await inngest.send({
          name: "homepage/target.generate",
          data: { targetId: target.id, prompt, triggeredBy: userId },
        });
      } catch (e) {
        console.error("[MCP_GENERATE_HOMEPAGE_SEND]", e);
        await prismadb.crm_Target_Homepage.update({
          where: { id: homepageId },
          data: { status: "FAILED", error: "Failed to queue generation job" },
        });
        externalError("Failed to queue homepage generation");
      }

      await writeAuditLog({
        entityType: "target",
        entityId: target.id,
        action: "updated",
        changes: [{ field: "homepage", old: null, new: "generation queued" }],
        userId,
      });
      return itemResponse({ queued: true, slug, status: "PENDING" });
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
