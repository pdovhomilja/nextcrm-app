"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import {
  getCalendlySettings,
  saveCalendlySettings,
  setCalendlyWebhookUri,
} from "@/lib/crm/calendar/calendly-settings";

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const user = await prismadb.users.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "admin") throw new Error("Forbidden");
}

export async function saveCalendlyAction(formData: FormData) {
  await requireAdmin();
  const apiToken = String(formData.get("apiToken") ?? "").trim();
  const signingKey = String(formData.get("signingKey") ?? "").trim();
  await saveCalendlySettings({
    ...(apiToken ? { apiToken } : {}),
    ...(signingKey ? { signingKey } : {}),
  });
  revalidatePath("/admin/calendar-settings");
}

export async function subscribeCalendlyWebhook(): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
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
}
