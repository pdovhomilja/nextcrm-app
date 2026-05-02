import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { getApiKey } from "@/lib/api-keys";
import {
  requireAuthenticated,
  filterAuthorizedContactIds,
  unauthorizedResponse,
  forbiddenResponse,
  AuthenticationError,
} from "@/lib/authz";

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return unauthorizedResponse();
    throw e;
  }

  const { contactIds, fields } = await request.json();

  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return NextResponse.json({ error: "contactIds must be a non-empty array" }, { status: 400 });
  }
  if (contactIds.length > 100) {
    return NextResponse.json({ error: "Maximum 100 contacts per batch" }, { status: 400 });
  }
  if (!Array.isArray(fields) || fields.length === 0) {
    return NextResponse.json({ error: "fields must be a non-empty array" }, { status: 400 });
  }

  const firecrawlApiKey = await getApiKey("FIRECRAWL", user.id);
  const openaiApiKey = await getApiKey("OPENAI", user.id);
  if (!firecrawlApiKey || !openaiApiKey) {
    return NextResponse.json({ error: "NO_API_KEY" }, { status: 402 });
  }

  const authorized = await filterAuthorizedContactIds(user, contactIds);
  if (authorized.length !== contactIds.length) {
    return forbiddenResponse();
  }

  await inngest.send({
    name: "enrich/contacts.bulk",
    data: { contactIds, fields, triggeredBy: user.id },
  });

  return NextResponse.json({ success: true, count: contactIds.length });
}
