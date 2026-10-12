import { SDK_VERSION, satisfiesSdkRange } from "@nextcrm/plugin-sdk";
import { prismaBase } from "@/lib/prisma-base";
import { writeAuditLog } from "@/lib/audit-log";
import { inngest } from "@/inngest/client";
import { findPlugin } from "./registry";
import { getPluginState, invalidatePluginCache } from "./state";
import { decryptSecrets, encryptSecrets } from "./settings";
import { createPluginContext } from "./context";
import { runAsActor } from "./actor";
import { writePluginLog } from "./log";

type Input = { settings: Record<string, unknown>; secrets: Record<string, unknown> };

const audit = (id: string, userId: string, action: "installed" | "uninstalled" | "enabled" | "disabled" | "settings_changed") =>
  writeAuditLog({ entityType: "plugin", entityId: id, action, changes: null, userId });

export async function installPlugin(id: string, userId: string, input: Input): Promise<void> {
  const plugin = findPlugin(id);
  if (!plugin) throw new Error("Plugin not found");
  if (await getPluginState(id)) throw new Error("Plugin already installed");
  const { definition } = plugin;
  if (!satisfiesSdkRange(definition.sdk)) throw new Error(`Incompatible SDK: requires ${definition.sdk}, running ${SDK_VERSION}`);
  const settings = definition.settings.parse(input.settings);
  const secrets = definition.secrets.parse(input.secrets);
  await prismaBase.installedPlugin.create({
    data: { id, version: definition.version, status: "ENABLED", settings: settings as never, secrets: encryptSecrets(secrets), installedBy: userId },
  });
  invalidatePluginCache();
  try {
    await inngest.send({ name: "plugin/installed", data: { pluginId: id } });
  } catch (e) {
    // Without the install event onInstall never runs; undo so the admin can retry.
    await prismaBase.installedPlugin.delete({ where: { id } });
    invalidatePluginCache();
    writePluginLog(id, "error", `Install event could not be sent: ${String(e)}`);
    throw new Error("Plugin installation could not be started; please try again.");
  }
  await audit(id, userId, "installed");
}

export async function setPluginEnabled(id: string, userId: string, enabled: boolean): Promise<void> {
  await prismaBase.installedPlugin.update({ where: { id }, data: { status: enabled ? "ENABLED" : "DISABLED" } });
  invalidatePluginCache();
  await audit(id, userId, enabled ? "enabled" : "disabled");
}

export async function savePluginSettings(id: string, userId: string, input: Input): Promise<void> {
  const plugin = findPlugin(id);
  const state = await getPluginState(id);
  if (!plugin || !state) throw new Error("Plugin not installed");
  const settings = plugin.definition.settings.parse(input.settings);
  const existing = decryptSecrets(state.secrets);
  const submitted = Object.fromEntries(Object.entries(input.secrets).filter(([, v]) => v !== "" && v !== undefined));
  const secrets = plugin.definition.secrets.parse({ ...existing, ...submitted });
  await prismaBase.installedPlugin.update({ where: { id }, data: { settings: settings as never, secrets: encryptSecrets(secrets) } });
  invalidatePluginCache();
  await audit(id, userId, "settings_changed");
}

export async function getUninstallSummary(id: string) {
  const [entries, groups, logLines] = await Promise.all([
    prismaBase.pluginData.count({ where: { pluginId: id } }),
    prismaBase.pluginData.groupBy({ by: ["entityType", "entityId"], where: { pluginId: id, NOT: { entityId: "" } } }),
    prismaBase.pluginLog.count({ where: { pluginId: id } }),
  ]);
  return { entries, records: groups.length, logLines };
}

export async function exportPluginData(id: string) {
  const state = await getPluginState(id);
  const rows = await prismaBase.pluginData.findMany({ where: { pluginId: id }, orderBy: [{ entityType: "asc" }, { entityId: "asc" }, { key: "asc" }] });
  return {
    pluginId: id,
    exportedAt: new Date().toISOString(),
    settings: state?.settings ?? {},
    data: rows.map((r) => ({ entityType: r.entityType, entityId: r.entityId, key: r.key, value: r.value })),
  };
}

export async function uninstallPlugin(id: string, userId: string): Promise<void> {
  const plugin = findPlugin(id);
  if (plugin?.definition.onUninstall) {
    try {
      const actor = { type: "plugin" as const, pluginId: id };
      const ctx = await createPluginContext({ plugin, actor });
      await runAsActor(actor, () => plugin.definition.onUninstall!(ctx));
    } catch (e) {
      writePluginLog(id, "error", `onUninstall failed: ${String(e)}`);
    }
  }
  await prismaBase.pluginData.deleteMany({ where: { pluginId: id } });
  await prismaBase.pluginLog.deleteMany({ where: { pluginId: id } });
  await prismaBase.installedPlugin.delete({ where: { id } });
  invalidatePluginCache();
  await audit(id, userId, "uninstalled");
}
