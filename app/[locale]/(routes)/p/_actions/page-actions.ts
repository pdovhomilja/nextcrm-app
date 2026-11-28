"use server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import type { Locale } from "@nextcrm/plugin-sdk";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import { getPluginState } from "@/lib/plugins/state";
import { findPlugin } from "@/lib/plugins/registry";
import { createPluginContext } from "@/lib/plugins/context";
import { writePluginLog } from "@/lib/plugins/log";

const isStringRecord = (v: unknown): v is Record<string, string> =>
  !!v && typeof v === "object" && !Array.isArray(v) && Object.values(v).every((x) => typeof x === "string");

/** Runs a plugin's page action (a button on a plugin page) for a caller whose role the action lists. */
export async function runPluginPageActionAction(pluginId: string, actionId: string, input: Record<string, string>): Promise<{ ok: boolean; message?: string; error?: string }> {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { ok: false, error: "Unauthorized" };
    throw e;
  }
  if (!isStringRecord(input)) return { ok: false, error: "Invalid input" };
  const plugin = findPlugin(pluginId);
  const action = plugin?.definition.extensions.pageActions.find((a) => a.id === actionId);
  const state = await getPluginState(pluginId);
  if (!plugin || !action || state?.status !== "ENABLED") return { ok: false, error: "Not found" };
  // Partners never run a page action, even when a plugin lists the role.
  if (user.role === "partner" || !action.roles.includes(user.role)) return { ok: false, error: "Forbidden" };
  const ctx = await createPluginContext({ plugin, actor: { type: "user", userId: user.id, role: user.role }, locale: (await getLocale()) as Locale });
  try {
    const message = await action.handler(ctx, { ...input });
    revalidatePath(`/p/${pluginId}`, "layout");
    return { ok: true, ...(message ? { message } : {}) };
  } catch (e) {
    writePluginLog(pluginId, "error", `Page action ${actionId} failed: ${String(e)}`);
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
