import { NextRequest, NextResponse } from "next/server";
import { FIELD_MAP } from "@/lib/enrichment/presets/target-fields";
import { assertTargetEditable, CampaignLockedError } from "@/lib/campaigns/approval-lock";
import {
  requireAuthenticated,
  unauthorizedResponse,
  notFoundOrForbiddenResponse,
  AuthenticationError,
  AuthorizationError,
  assertCanWriteTarget,
  tryScopedUpdateTarget,
} from "@/lib/authz";

export async function PATCH(
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

  const { enrichmentFields } = await request.json();
  if (!enrichmentFields || typeof enrichmentFields !== "object") {
    return NextResponse.json({ error: "enrichmentFields required" }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  for (const [key, value] of Object.entries(enrichmentFields)) {
    const column = FIELD_MAP[key];
    if (column) updates[column] = String(value);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Scope first, so the lock message never reveals a target the caller can't write.
  try {
    await assertCanWriteTarget(user, id);
    await assertTargetEditable(user, id, updates);
  } catch (e) {
    if (e instanceof AuthorizationError) return notFoundOrForbiddenResponse();
    if (e instanceof CampaignLockedError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }

  const ok = await tryScopedUpdateTarget(user, id, updates);
  if (!ok) return notFoundOrForbiddenResponse();

  return NextResponse.json({ success: true, id });
}
