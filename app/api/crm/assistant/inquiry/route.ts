// Fork-added (Rade): narrow write-only endpoint for the public AI assistants
// (website chat + voice agent, orchestrated by n8n). Records a lead and a
// conversation activity; returns only the ids it created or matched.
// Contract: docs/reference/ASSISTANT_INQUIRY_API.md
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthorizedAssistant } from "@/lib/crm/assistant/auth";
import { checkAssistantRateLimit } from "@/lib/crm/assistant/rate-limit";
import { assistantInquirySchema } from "@/lib/crm/assistant/schema";
import { recordAssistantInquiry } from "@/lib/crm/assistant/record-inquiry";

export const dynamic = "force-dynamic";

const error = (status: number, message: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ status: "error", message, ...extra }, { status });

export async function POST(req: Request) {
  const { success } = await checkAssistantRateLimit(req);
  if (!success) return error(429, "Too many requests");

  if (!isAuthorizedAssistant(req.headers.get("authorization"))) {
    return error(401, "Unauthorized");
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return error(400, "Body must be valid JSON");
  }

  const parsed = assistantInquirySchema.safeParse(raw);
  if (!parsed.success) {
    const { formErrors, fieldErrors } = z.flattenError(parsed.error);
    return error(400, "Validation failed", { formErrors, fieldErrors });
  }

  try {
    const outcome = await recordAssistantInquiry(parsed.data);
    if (outcome.kind === "in_progress") {
      return error(409, "A request with this idempotencyKey is still in progress; retry shortly");
    }
    const { kind: _kind, ...result } = outcome;
    return NextResponse.json({ status: "success", ...result });
  } catch (e) {
    console.error("[assistant-inquiry] failed to record inquiry", e);
    return error(500, "Could not record inquiry");
  }
}
