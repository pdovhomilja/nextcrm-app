import {
  requireAuthenticated,
  assertCanWriteTarget,
  unauthorizedResponse,
  notFoundOrForbiddenResponse,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { queueHomepageGeneration } from "@/lib/homepage/queue-generation";
import { NextRequest, NextResponse } from "next/server";

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

  // A JSON `null` / non-object body would make `body.prompt` throw; coerce to {}.
  const raw = await request.json().catch(() => ({}));
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const prompt = typeof body.prompt === "string" && body.prompt.trim() ? body.prompt : undefined;
  const requestedSlug = typeof body.slug === "string" ? body.slug : undefined;

  const result = await queueHomepageGeneration({
    target: { id: target.id, company: target.company, company_website: target.company_website },
    prompt,
    requestedSlug,
    userId: user.id,
  });

  if (!result.ok) {
    let status: number;
    if (result.code === "PROMPT_TOO_LONG") status = 400;
    else if (result.code === "SLUG_LOCKED" || result.code === "CONFLICT" || result.code === "BUSY") status = 409;
    else status = 502;
    return NextResponse.json({ error: result.message }, { status });
  }

  return NextResponse.json({ queued: true, slug: result.slug });
}
