import { NextResponse } from "next/server";

import { verifyBearerSecret } from "@/lib/auth/verify-bearer-secret";
import { intakeWebsiteLead } from "@/lib/crm/leads/intake-website-lead";
import { websiteLeadIntakeSchema } from "@/lib/crm/leads/website-intake-schema";
import { checkPublicLeadsRateLimit, getClientIp } from "@/lib/public/leads-rate-limit";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 32 * 1024;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: Request) {
  const secret = process.env.WEBSITE_LEADS_API_KEY?.trim();
  if (!secret) {
    console.error("[public/leads] WEBSITE_LEADS_API_KEY is not configured");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  if (!verifyBearerSecret(req.headers.get("authorization"), secret)) {
    return unauthorized();
  }

  const ip = getClientIp(req);
  const allowed = await checkPublicLeadsRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  let json: unknown;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", fields: { body: ["Must be valid JSON"] } },
      { status: 400 }
    );
  }

  const parsed = websiteLeadIntakeSchema.safeParse(json);
  if (!parsed.success) {
    const fields: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "body";
      if (!fields[key]) fields[key] = [];
      fields[key].push(issue.message);
    }
    return NextResponse.json({ error: "Validation failed", fields }, { status: 400 });
  }

  const idempotencyKey = req.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: "Missing Idempotency-Key header", fields: { "Idempotency-Key": ["Required"] } },
      { status: 400 }
    );
  }
  if (idempotencyKey !== parsed.data.externalId) {
    return NextResponse.json(
      {
        error: "Idempotency-Key must match externalId",
        fields: { "Idempotency-Key": ["Must equal body.externalId"] },
      },
      { status: 400 }
    );
  }

  const result = await intakeWebsiteLead(parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.fields ? { fields: result.fields } : {}) },
      { status: result.status }
    );
  }

  return NextResponse.json(
    { ok: true, leadId: result.leadId },
    { status: result.created ? 201 : 200 }
  );
}
