import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import { isHomepageRunActive } from "@/lib/homepage/queue-generation";
import { ensureUniqueSlug, slugify } from "@/lib/homepage/slug";
import { putHomepageUpload } from "@/lib/homepage/storage";
import { MAX_UPLOAD_BYTES } from "@/lib/homepage/upload-limits";

export type UploadHomepageResult =
  | { ok: true; slug: string }
  | {
      ok: false;
      code: "TOO_LARGE" | "NOT_HTML" | "EMPTY" | "BUSY" | "CONFLICT" | "STORE_FAILED" | "QUEUE_FAILED";
      message: string;
    };

/**
 * Validate + stage + queue an uploaded homepage override. The HTML is
 * deliberately NOT sanitized (that would break the design; isolation is the
 * serve-time sandbox) and is stored byte-identical at the transient upload key.
 *
 * Caller MUST have already authenticated, authorized (assertCanWriteTarget) and
 * checked the target is APPROVED — this helper performs no authz.
 */
export async function runUploadHomepage(input: {
  targetId: string;
  company: string | null;
  html: string;
  userId: string;
}): Promise<UploadHomepageResult> {
  const { targetId, company, html, userId } = input;

  if (typeof html !== "string" || html.length === 0) {
    return { ok: false, code: "EMPTY", message: "No HTML provided" };
  }
  if (Buffer.byteLength(html, "utf8") > MAX_UPLOAD_BYTES) {
    return { ok: false, code: "TOO_LARGE", message: "File too large (max 4 MB)" };
  }
  const probe = html.trim().toLowerCase();
  if (!(probe.includes("<html") || probe.includes("<!doctype html") || probe.includes("<body"))) {
    return { ok: false, code: "NOT_HTML", message: "That doesn't look like an HTML document" };
  }

  const existing = await prismadb.crm_Target_Homepage.findUnique({
    where: { targetId },
    select: { id: true, slug: true, status: true, updatedAt: true },
  });
  if (existing && isHomepageRunActive(existing.status, existing.updatedAt)) {
    return {
      ok: false,
      code: "BUSY",
      message: "A generation is already in progress. Wait for it to finish.",
    };
  }

  let homepageId: string;
  let slug: string;
  try {
    if (existing) {
      await prismadb.crm_Target_Homepage.update({
        where: { id: existing.id },
        data: { status: "PENDING", error: null, deletedAt: null },
      });
      homepageId = existing.id;
      slug = existing.slug;
    } else {
      const name = company ?? "";
      slug = await ensureUniqueSlug(slugify(name) ? name : `site-${targetId.slice(0, 8)}`);
      const created = await prismadb.crm_Target_Homepage.create({
        data: { targetId, slug, status: "PENDING", created_by: userId },
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
    await putHomepageUpload(slug, html);
  } catch (e) {
    console.error("[UPLOAD_HOMEPAGE_STORE]", e);
    await prismadb.crm_Target_Homepage.update({
      where: { id: homepageId },
      data: { status: "FAILED", error: "Failed to store upload" },
    });
    return { ok: false, code: "STORE_FAILED", message: "Failed to store the upload" };
  }

  try {
    await inngest.send({
      name: "homepage/target.upload",
      data: { homepageId, targetId, slug, triggeredBy: userId },
    });
  } catch (e) {
    console.error("[UPLOAD_HOMEPAGE_SEND]", e);
    await prismadb.crm_Target_Homepage.update({
      where: { id: homepageId },
      data: { status: "FAILED", error: "Failed to queue upload" },
    });
    return { ok: false, code: "QUEUE_FAILED", message: "Failed to queue upload" };
  }

  await writeAuditLog({
    entityType: "target",
    entityId: targetId,
    action: "updated",
    changes: [{ field: "homepage", old: null, new: "upload queued" }],
    userId,
  });
  return { ok: true, slug };
}
