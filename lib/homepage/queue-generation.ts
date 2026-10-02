import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import { ensureUniqueSlug, slugify } from "@/lib/homepage/slug";

/**
 * Single source of truth for "queue a homepage generation" — shared by the web
 * route (app/api/crm/targets/[id]/generate-homepage) and the MCP tool
 * (crm_generate_homepage) so the published-slug guard and in-flight guard can
 * never drift between the two entry points again (see deep-review H2/M3).
 *
 * The CALLER owns: authentication, authorization (assertCanWriteTarget / MCP
 * created_by scope), the target lookup, and the APPROVED gate. This helper owns
 * the row upsert, the guards, the event send, and the audit entry.
 */

/** Upper bound on operator guidance sent to the model (route / MCP / refine). */
export const MAX_HOMEPAGE_PROMPT_CHARS = 4000;

/**
 * A homepage is considered "busy" only while a run is PENDING/RUNNING AND the row
 * was touched within this window. Past it we assume the Inngest event was lost or
 * the run was cancelled (onFailure doesn't fire on cancellation, and a platform
 * timeout can skip the in-body catch) and allow a fresh queue — otherwise a stuck
 * row would block generate/refine/revert forever. The per-target Inngest
 * concurrency key (limit 1) still serializes any genuinely concurrent run.
 */
export const STALE_RUN_MS = 10 * 60_000;

/** True when a run is active AND recent (see STALE_RUN_MS). Null/old timestamp → not active. */
export function isHomepageRunActive(
  status: string | null | undefined,
  updatedAt: Date | null | undefined,
): boolean {
  if (status !== "PENDING" && status !== "RUNNING") return false;
  if (!updatedAt) return false;
  return Date.now() - new Date(updatedAt).getTime() < STALE_RUN_MS;
}

export type QueueTarget = {
  id: string;
  company: string | null;
  company_website: string | null;
};

export type QueueGenerationResult =
  | { ok: true; homepageId: string; slug: string }
  | { ok: false; code: "SLUG_LOCKED" | "CONFLICT" | "BUSY" | "QUEUE_FAILED" | "PROMPT_TOO_LONG"; message: string };

/**
 * Resolve the homepage slug. An explicit slug wins; otherwise derive from the
 * company name. A blank/all-symbol company slugifies to "", so fall back to a
 * slug derived from the target id (never leave an empty/colliding slug).
 */
async function resolveSlug(targetId: string, company: string | null, requested?: string) {
  const candidates = [requested, company ?? "", `site-${targetId.slice(0, 8)}`];
  for (const c of candidates) {
    if (c && slugify(c)) return ensureUniqueSlug(c);
  }
  return ensureUniqueSlug(`site-${targetId.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "page"}`);
}

export async function queueHomepageGeneration(input: {
  target: QueueTarget;
  prompt?: string;
  requestedSlug?: string;
  /**
   * One-shot HOMEPAGE_STYLE override (the drawer's Style pick) for THIS run only.
   * Passed straight through to the event; the job fails open to the auto pick for
   * an absent/unknown id, so no validation is needed here.
   */
  stylePromptId?: string | null;
  userId: string;
}): Promise<QueueGenerationResult> {
  const { target, userId } = input;
  const stylePromptId =
    typeof input.stylePromptId === "string" && input.stylePromptId.trim()
      ? input.stylePromptId.trim()
      : undefined;
  const trimmedPrompt = input.prompt?.trim();
  if (trimmedPrompt && trimmedPrompt.length > MAX_HOMEPAGE_PROMPT_CHARS) {
    return {
      ok: false,
      code: "PROMPT_TOO_LONG",
      message: `Prompt is too long (max ${MAX_HOMEPAGE_PROMPT_CHARS} characters).`,
    };
  }
  const prompt = trimmedPrompt || undefined;
  const requestedSlug = input.requestedSlug?.trim() ? input.requestedSlug : undefined;

  // The row MUST exist before the event is sent: the job looks it up by targetId
  // and silently skips when there is none.
  const existing = await prismadb.crm_Target_Homepage.findUnique({
    where: { targetId: target.id },
    select: { id: true, slug: true, status: true, preview_url: true, current_version_id: true, updatedAt: true },
  });

  // In-flight guard: a double submit would queue a second full run (4 vision
  // calls) and reset a RUNNING row's status back to PENDING. A STALE PENDING/
  // RUNNING row (lost/cancelled event) is NOT treated as busy, so regenerate can
  // always recover it (see isHomepageRunActive / STALE_RUN_MS).
  if (existing && isHomepageRunActive(existing.status, existing.updatedAt)) {
    return { ok: false, code: "BUSY", message: "A generation is already in progress for this target." };
  }

  const baseData = {
    status: "PENDING" as const,
    base_prompt: prompt ?? null,
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
        // Renaming only edits the DB row; published objects stay under the old
        // slug, so a rename would 404 a live (possibly emailed) link.
        if (existing.preview_url || existing.current_version_id) {
          return {
            ok: false,
            code: "SLUG_LOCKED",
            message: "This page is already published; its URL can't be changed. Omit slug to regenerate.",
          };
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
      return { ok: false, code: "CONFLICT", message: "Slug or homepage already exists; retry" };
    }
    throw e;
  }

  try {
    await inngest.send({
      name: "homepage/target.generate",
      data: { targetId: target.id, prompt, stylePromptId, triggeredBy: userId },
    });
  } catch (e) {
    console.error("[QUEUE_HOMEPAGE_GENERATION_SEND]", e);
    await prismadb.crm_Target_Homepage.update({
      where: { id: homepageId },
      data: { status: "FAILED", error: "Failed to queue generation job" },
    });
    return { ok: false, code: "QUEUE_FAILED", message: "Failed to queue homepage generation" };
  }

  await writeAuditLog({
    entityType: "target",
    entityId: target.id,
    action: "updated",
    changes: [{ field: "homepage", old: null, new: "generation queued" }],
    userId,
  });

  return { ok: true, homepageId, slug };
}
