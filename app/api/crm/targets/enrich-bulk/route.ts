import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { getApiKey } from "@/lib/api-keys";
import { FIELD_MAP } from "@/lib/enrichment/presets/target-fields";
import type { EnrichmentField } from "@/lib/enrichment/types";
import {
  requireAuthenticated,
  filterAuthorizedTargetIds,
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

  const { targetIds, fields } = await request.json();

  if (!Array.isArray(targetIds) || targetIds.length === 0) {
    return NextResponse.json({ error: "targetIds must be a non-empty array" }, { status: 400 });
  }
  if (targetIds.length > 100) {
    return NextResponse.json({ error: "Maximum 100 targets per batch" }, { status: 400 });
  }
  if (!Array.isArray(fields) || fields.length === 0) {
    return NextResponse.json({ error: "fields must be a non-empty array" }, { status: 400 });
  }

  const validFieldNames = new Set(Object.keys(FIELD_MAP));
  // fields is `any` here (destructured from request.json()) — cast before filtering
  const invalidFields = (fields as EnrichmentField[]).filter((f) => !validFieldNames.has(f.name));
  if (invalidFields.length > 0) {
    return NextResponse.json(
      { error: `Unknown fields: ${invalidFields.map((f) => f.name).join(", ")}` },
      { status: 400 }
    );
  }

  const firecrawlApiKey = await getApiKey("FIRECRAWL", user.id);
  const openaiApiKey = await getApiKey("OPENAI", user.id);
  if (!firecrawlApiKey || !openaiApiKey) {
    return NextResponse.json({ error: "NO_API_KEY" }, { status: 402 });
  }

  const authorized = await filterAuthorizedTargetIds(user, targetIds);
  if (authorized.length !== targetIds.length) {
    return forbiddenResponse();
  }

  await inngest.send({
    name: "enrich/targets.bulk",
    data: { targetIds, fields, triggeredBy: user.id },
  });

  return NextResponse.json({ success: true, count: targetIds.length });
}
