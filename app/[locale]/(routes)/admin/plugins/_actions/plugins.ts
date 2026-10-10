"use server";
import { revalidatePath } from "next/cache";
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";
import { installPlugin, savePluginSettings, setPluginEnabled, uninstallPlugin } from "@/lib/plugins/lifecycle";
import { getPluginState } from "@/lib/plugins/state";
import { decryptSecrets } from "@/lib/plugins/settings";
import { getLocale } from "next-intl/server";
import type { Locale } from "@nextcrm/plugin-sdk";
import { findPlugin } from "@/lib/plugins/registry";
import { createPluginContext } from "@/lib/plugins/context";
import { writePluginLog } from "@/lib/plugins/log";

type Result = { ok: boolean; error?: string };
type Values = Record<string, unknown>;

async function asAdmin(fn: (userId: string) => Promise<void>, path = "/admin/plugins"): Promise<Result> {
  let userId: string;
  try {
    userId = (await requireRole(["admin"])).id;
  } catch (e) {
    if (e instanceof AuthenticationError) return { ok: false, error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { ok: false, error: "Forbidden" };
    throw e;
  }
  try {
    await fn(userId);
    revalidatePath(path);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export const installPluginAction = async (id: string, settings: Values, secrets: Values) =>
  asAdmin((u) => installPlugin(id, u, { settings, secrets }));
export const setPluginEnabledAction = async (id: string, enabled: boolean) =>
  asAdmin((u) => setPluginEnabled(id, u, enabled));
export const savePluginSettingsAction = async (id: string, settings: Values, secrets: Values) =>
  asAdmin((u) => savePluginSettings(id, u, { settings, secrets }));
export const uninstallPluginAction = async (id: string) =>
  asAdmin((u) => uninstallPlugin(id, u));

export async function getSecretFlags(id: string): Promise<Record<string, boolean>> {
  await requireRole(["admin"]);
  const state = await getPluginState(id);
  const secrets = decryptSecrets(state?.secrets ?? null);
  return Object.fromEntries(Object.entries(secrets).map(([k, v]) => [k, v !== "" && v != null]));
}

export async function runPluginAdminActionAction(pluginId: string, actionId: string): Promise<{ ok: boolean; message?: string; error?: string }> {
  let adminId: string;
  try {
    adminId = (await requireRole(["admin"])).id;
  } catch (e) {
    if (e instanceof AuthenticationError) return { ok: false, error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { ok: false, error: "Forbidden" };
    throw e;
  }
  const plugin = findPlugin(pluginId);
  const action = plugin?.definition.extensions.adminActions.find((a) => a.id === actionId);
  const state = await getPluginState(pluginId);
  if (!plugin || !action || state?.status !== "ENABLED") return { ok: false, error: "Not found" };
  const ctx = await createPluginContext({ plugin, actor: { type: "user", userId: adminId, role: "admin" }, locale: (await getLocale()) as Locale });
  try {
    const message = await action.handler(ctx);
    revalidatePath(`/admin/plugins/${pluginId}`);
    return { ok: true, ...(message ? { message } : {}) };
  } catch (e) {
    writePluginLog(pluginId, "error", `Admin action ${actionId} failed: ${String(e)}`);
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
