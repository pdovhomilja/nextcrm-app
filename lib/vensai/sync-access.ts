export type VentureAccessSyncPayload = {
  email: string;
  workEmail?: string | null;
  name?: string | null;
  ventureSlugs: string[];
  crmEnabled: boolean;
};

/** Fire-and-forget webhook to VenSai Admin Portal (Bearer shared secret). */
export async function syncVentureAccessToAdminPortal(payload: VentureAccessSyncPayload) {
  const base = process.env.VENSAI_ADMIN_SYNC_URL?.trim().replace(/\/$/, "");
  const secret = process.env.VENSAI_ADMIN_SYNC_SECRET?.trim();
  if (!base || !secret) {
    return { ok: false as const, skipped: true as const };
  }

  try {
    const res = await fetch(`${base}/api/crm/sync-access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[vensai-sync] failed", res.status, text.slice(0, 200));
      return { ok: false as const, skipped: false as const, status: res.status };
    }
    return { ok: true as const, skipped: false as const };
  } catch (error) {
    console.error("[vensai-sync] error", error);
    return { ok: false as const, skipped: false as const };
  }
}
