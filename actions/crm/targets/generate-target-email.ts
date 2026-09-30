"use server";
import { prismadb } from "@/lib/prisma";
import { getApiKey } from "@/lib/api-keys";
import { extractJsonObject } from "@/lib/ai/anthropic-json";
import {
  requireAuthenticated,
  assertCanWriteTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

const SYSTEM_PROMPT = `You are an expert B2B outreach copywriter for a web design & engineering firm.
Write a short, personalized email BODY (no <html>, <head>, or <body> wrapper — it will be inserted into a template).
Return ONLY valid JSON in this exact shape: {"subject":"...","html":"..."}
The "html" is clean, inline-styled body markup (<p>, <a>, <strong>, <ul>).
You MAY use merge tags: {{first_name}}, {{last_name}}, {{company}}, {{position}}.
If the operator's instructions reference a homepage/mockup, you MAY include {{homepage_url}} (link) and/or {{homepage_screenshot}} (image URL for an <img src>).
Keep it concise and specific to the prospect. No placeholders like [Name].`;

export const generateTargetEmail = async ({
  targetId,
  prompt,
}: {
  targetId: string;
  prompt: string;
}): Promise<{ data: { subject: string; body_html: string } } | { error: string }> => {
  let user;
  try {
    user = await requireAuthenticated();
    await assertCanWriteTarget(user, targetId);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  const target = await prismadb.crm_Targets.findFirst({ where: { id: targetId, deletedAt: null } });
  if (!target) return { error: "Target not found" };
  if (target.triage_status !== "APPROVED")
    return { error: "Target must be approved before generating outreach" };

  const apiKey = await getApiKey("ANTHROPIC", user.id);
  if (!apiKey) return { error: "No Anthropic API key configured. Add one in Profile → LLMs." };

  const facts = [
    target.company ? `Company: ${target.company}` : null,
    target.position ? `Contact role: ${target.position}` : null,
    target.industry ? `Industry: ${target.industry}` : null,
    target.company_website ? `Website: ${target.company_website}` : null,
    target.description ? `Notes: ${target.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    // ANTHROPIC_BASE_URL is an optional test seam (same name the Anthropic SDKs use):
    // the E2E suite points it at a local mock so generation is deterministic and free.
    // Unset in every deployed environment -> the real API.
    const baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: `Operator instructions:\n${prompt}\n\nProspect facts:\n${facts}` },
        ],
      }),
    });
    if (!response.ok) return { error: "AI request failed. Please try again." };
    const data = await response.json();
    const text: string =
      (data?.content ?? []).find((b: any) => b?.type === "text")?.text ?? "";
    const raw = extractJsonObject(text);
    if (!raw) return { error: "AI returned an unexpected response. Please try again." };
    let parsed: { subject?: string; html?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { error: "AI returned an unexpected response. Please try again." };
    }
    if (!parsed.subject || !parsed.html)
      return { error: "AI returned an unexpected response. Please try again." };
    return { data: { subject: parsed.subject, body_html: parsed.html } };
  } catch {
    return { error: "AI request failed. Please try again." };
  } finally {
    clearTimeout(timeout);
  }
};
