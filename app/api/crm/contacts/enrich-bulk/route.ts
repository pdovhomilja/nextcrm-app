import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { inngest } from "@/inngest/client";
import { getApiKey } from "@/lib/api-keys";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const firecrawlApiKey = await getApiKey("FIRECRAWL", session.user.id);
  const openaiApiKey = await getApiKey("OPENAI", session.user.id);
  if (!firecrawlApiKey || !openaiApiKey) {
    return NextResponse.json({ error: "NO_API_KEY" }, { status: 402 });
  }

  await inngest.send({
    name: "enrich/contacts.bulk",
    data: { contactIds, fields, triggeredBy: session.user.id },
  });

  return NextResponse.json({ success: true, count: contactIds.length });
}
