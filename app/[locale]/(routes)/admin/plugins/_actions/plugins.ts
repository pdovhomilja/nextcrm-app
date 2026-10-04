"use server";
import { revalidatePath } from "next/cache";
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";
import { installPlugin, savePluginSettings, setPluginEnabled, uninstallPlugin } from "@/lib/plugins/lifecycle";
import { getPluginState } from "@/lib/plugins/state";
import { decryptSecrets } from "@/lib/plugins/settings";

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
