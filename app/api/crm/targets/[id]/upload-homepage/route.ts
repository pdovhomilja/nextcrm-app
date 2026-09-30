import {
  requireAuthenticated,
  assertCanWriteTarget,
  unauthorizedResponse,
  notFoundOrForbiddenResponse,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { runUploadHomepage } from "@/lib/homepage/upload-homepage-core";
import { NextRequest, NextResponse } from "next/server";

// A route handler (not a Server Action): Server Actions cap request bodies at
// ~1 MB, which would reject the common case of a self-contained page with
// inlined assets before the 4 MB check could run. Route handlers accept ~4.5 MB.
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
    select: { id: true, company: true, triage_status: true },
  });
  if (!target) return NextResponse.json({ error: "Target not found" }, { status: 404 });
  if (target.triage_status !== "APPROVED") {
    return NextResponse.json(
      { error: "Target must be approved before uploading a homepage" },
      { status: 409 },
    );
  }

  // A JSON `null` / non-object body would make `body.html` throw; coerce to {}.
  const raw = await request.json().catch(() => ({}));
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const html = typeof body.html === "string" ? body.html : "";

  const result = await runUploadHomepage({
    targetId: target.id,
    company: target.company,
    html,
    userId: user.id,
  });

  if (!result.ok) {
    let status: number;
    if (result.code === "TOO_LARGE" || result.code === "NOT_HTML" || result.code === "EMPTY") status = 400;
    else if (result.code === "BUSY" || result.code === "CONFLICT") status = 409;
    else status = 502;
    return NextResponse.json({ error: result.message }, { status });
  }
  return NextResponse.json({ queued: true, slug: result.slug });
}
