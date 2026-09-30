import {
  requireAuthenticated,
  assertCanWriteTarget,
  unauthorizedResponse,
  notFoundOrForbiddenResponse,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { ensureUniqueSlug, slugify } from "@/lib/homepage/slug";
import { NextRequest, NextResponse } from "next/server";

/**
 * Resolve the homepage slug. An explicit body slug wins; otherwise derive from
 * the company name. An all-symbol/blank company slugifies to "", so fall back
 * to a slug derived from the target id (never leave an empty/colliding slug).
 */
async function resolveSlug(targetId: string, company: string | null, requested?: string) {
  const candidates = [requested, company ?? "", `site-${targetId.slice(0, 8)}`];
  for (const c of candidates) {
    if (c && slugify(c)) return ensureUniqueSlug(c);
  }
  // Unreachable in practice (target ids are hex UUIDs), but never persist "".
  return ensureUniqueSlug(`site-${targetId.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "page"}`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return unauthorizedResponse();
    throw e;
  }
  try {
    await assertCanWriteTarget(user, id);
  } catch (e) {
    if (e instanceof AuthorizationError) return notFoundOrForbiddenResponse();
    throw e;
  }

  const target = await prismadb.crm_Targets.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, company: true, company_website: true, triage_status: true },
  });
  if (!target) return NextResponse.json({ error: "Target not found" }, { status: 404 });
  if (target.triage_status !== "APPROVED") {
    return NextResponse.json(
      { error: "Target must be approved before generating a homepage" },
      { status: 409 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const prompt: string | undefined =
    typeof body.prompt === "string" && body.prompt.trim() ? body.prompt.trim() : undefined;
  const requestedSlug: string | undefined = typeof body.slug === "string" ? body.slug : undefined;

  // The row MUST exist before the event is sent: the job looks it up by
  // targetId and silently skips when there is none.
  const existing = await prismadb.crm_Target_Homepage.findUnique({
    where: { targetId: id },
    select: { id: true, slug: true },
  });
  const baseData = {
    status: "PENDING" as const,
    base_prompt: prompt ?? null,
    source_url: target.company_website ?? null,
    error: null,
    deletedAt: null,
  };
  let homepageId: string;
  try {
    if (existing) {
      // Regenerate keeps the live slug (and its stored objects) unless a
      // different one was explicitly requested.
      const data: typeof baseData & { slug?: string } = { ...baseData };
      if (requestedSlug && slugify(requestedSlug) && slugify(requestedSlug) !== existing.slug) {
        data.slug = await ensureUniqueSlug(requestedSlug);
      }
      await prismadb.crm_Target_Homepage.update({ where: { id: existing.id }, data });
      homepageId = existing.id;
    } else {
      const slug = await resolveSlug(id, target.company, requestedSlug);
      const created = await prismadb.crm_Target_Homepage.create({
        data: { ...baseData, targetId: id, slug, created_by: user.id },
      });
      homepageId = created.id;
    }
  } catch (e) {
    // ensureUniqueSlug is check-then-write; a concurrent request can still
    // collide on slug or targetId.
    if ((e as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "Slug or homepage already exists; retry" }, { status: 409 });
    }
    throw e;
  }

  try {
    await inngest.send({
      name: "homepage/target.generate",
      data: { targetId: id, prompt, triggeredBy: user.id },
    });
  } catch (e) {
    console.error("[GENERATE_HOMEPAGE_SEND]", e);
    await prismadb.crm_Target_Homepage.update({
      where: { id: homepageId },
      data: { status: "FAILED", error: "Failed to queue generation job" },
    });
    return NextResponse.json({ error: "Failed to queue generation" }, { status: 502 });
  }

  await writeAuditLog({
    entityType: "target",
    entityId: id,
    action: "updated",
    changes: [{ field: "homepage", old: null, new: "generation queued" }],
    userId: user.id,
  });
  return NextResponse.json({ queued: true });
}
