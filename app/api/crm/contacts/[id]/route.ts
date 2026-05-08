import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticated,
  unauthorizedResponse,
  notFoundOrForbiddenResponse,
  AuthenticationError,
  tryScopedUpdateContact,
} from "@/lib/authz";

const FIELD_MAP: Record<string, string> = {
  position:         "position",
  website:          "website",
  social_linkedin:  "social_linkedin",
  social_twitter:   "social_twitter",
  social_facebook:  "social_facebook",
  social_instagram: "social_instagram",
  description:      "description",
  office_phone:     "office_phone",
  mobile_phone:     "mobile_phone",
};

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

  const ok = await tryScopedUpdateContact(user, id, updates);
  if (!ok) return notFoundOrForbiddenResponse();

  return NextResponse.json({ success: true, id });
}
