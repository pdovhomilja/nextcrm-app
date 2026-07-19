"use server";

import { revalidatePath } from "next/cache";
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";
import {
  getCalendlySettings,
  saveCalendlySettings,
  setCalendlyWebhookUri,
} from "@/lib/crm/calendar/calendly-settings";

async function ensureAdmin(): Promise<{ error: string } | null> {
  try {
    await requireRole(["admin"]);
    return null;
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }
}

export async function saveCalendlyAction(formData: FormData) {
  const denied = await ensureAdmin();
  if (denied) throw new Error(denied.error);
  const apiToken = String(formData.get("apiToken") ?? "").trim();
  const signingKey = String(formData.get("signingKey") ?? "").trim();
  await saveCalendlySettings({
    ...(apiToken ? { apiToken } : {}),
    ...(signingKey ? { signingKey } : {}),
  });
  revalidatePath("/admin/calendar-settings");
}

export async function subscribeCalendlyWebhook(): Promise<{ ok: boolean; error?: string }> {
  const denied = await ensureAdmin();
  if (denied) return { ok: false, error: denied.error };

  try {
    const { apiToken } = await getCalendlySettings();
    if (!apiToken) return { ok: false, error: "Save the API token first." };

    const headers = {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    };

    const meRes = await fetch("https://api.calendly.com/users/me", { headers });
    if (!meRes.ok) return { ok: false, error: `Calendly /users/me failed (${meRes.status})` };
    const me = (await meRes.json()) as { resource: { current_organization: string } };

    const subRes = await fetch("https://api.calendly.com/webhook_subscriptions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/crm/calendar/webhooks/calendly`,
        events: ["invitee.created", "invitee.canceled"],
        organization: me.resource.current_organization,
        scope: "organization",
      }),
    });
    if (!subRes.ok) {
      const detail = await subRes.text();
      return { ok: false, error: `Subscription failed (${subRes.status}): ${detail.slice(0, 200)}` };
    }
    const sub = (await subRes.json()) as { resource: { uri: string } };
    await setCalendlyWebhookUri(sub.resource.uri);
    revalidatePath("/admin/calendar-settings");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Calendly request failed",
    };
  }
}
