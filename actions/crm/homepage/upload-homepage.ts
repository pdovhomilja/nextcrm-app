"use server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import {
  requireAuthenticated,
  assertCanWriteTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { isHomepageRunActive } from "@/lib/homepage/queue-generation";
import { ensureUniqueSlug, slugify } from "@/lib/homepage/slug";
import { putHomepageUpload } from "@/lib/homepage/storage";
import { MAX_UPLOAD_BYTES } from "@/lib/homepage/upload-limits";

/**
 * Upload-override: an authorized user supplies a self-contained HTML file that
 * replaces the generated design. The HTML is deliberately NOT sanitized (that
 * would break the design); isolation is the serve-time sandbox. It is stored
 * byte-identical at the transient upload key and the upload Inngest flow
 * publishes it. Authz + validation run before any write.
 */
export const uploadHomepage = async (data: {
  targetId: string;
  html: string;
}): Promise<{ data: { queued: true; slug: string } } | { error: string }> => {
  const { targetId, html } = data ?? ({} as { targetId?: string; html?: unknown });
  if (typeof html !== "string" || html.length === 0) return { error: "No HTML provided" };
  if (typeof targetId !== "string" || !targetId) return { error: "targetId is required" };

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    await assertCanWriteTarget(user, targetId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  const target = await prismadb.crm_Targets.findFirst({
    where: { id: targetId, deletedAt: null },
    select: { id: true, company: true, triage_status: true },
  });
  if (!target) return { error: "Target not found" };
  if (target.triage_status !== "APPROVED") {
    return { error: "Target must be approved before uploading a homepage" };
  }

  if (Buffer.byteLength(html, "utf8") > MAX_UPLOAD_BYTES) {
    return { error: "File too large (max 4 MB)" };
  }
  const probe = html.trim().toLowerCase();
  if (!(probe.includes("<html") || probe.includes("<!doctype html") || probe.includes("<body"))) {
    return { error: "That doesn't look like an HTML document" };
  }

  const existing = await prismadb.crm_Target_Homepage.findUnique({
    where: { targetId },
    select: { id: true, slug: true, status: true, updatedAt: true },
  });
  if (existing && isHomepageRunActive(existing.status, existing.updatedAt)) {
    return { error: "A generation is already in progress. Wait for it to finish." };
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
      const company = target.company ?? "";
      slug = await ensureUniqueSlug(slugify(company) ? company : `site-${targetId.slice(0, 8)}`);
      const created = await prismadb.crm_Target_Homepage.create({
        data: { targetId, slug, status: "PENDING", created_by: user.id },
      });
      homepageId = created.id;
    }
  } catch (e) {
    // ensureUniqueSlug is check-then-write; a concurrent request can collide.
    if ((e as { code?: string })?.code === "P2002") {
      return { error: "Slug or homepage already exists; retry" };
    }
    throw e;
  }

  await putHomepageUpload(slug, html);

  try {
    await inngest.send({
      name: "homepage/target.upload",
      data: { homepageId, targetId, slug, triggeredBy: user.id },
    });
  } catch (e) {
    console.error("[UPLOAD_HOMEPAGE_SEND]", e);
    await prismadb.crm_Target_Homepage.update({
      where: { id: homepageId },
      data: { status: "FAILED", error: "Failed to queue upload" },
    });
    return { error: "Failed to queue upload" };
  }

  await writeAuditLog({
    entityType: "target",
    entityId: targetId,
    action: "updated",
    changes: [{ field: "homepage", old: null, new: "upload queued" }],
    userId: user.id,
  });
  return { data: { queued: true, slug } };
};
