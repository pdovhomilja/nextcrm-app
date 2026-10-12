import { compareVersions } from "@nextcrm/plugin-sdk";
import { prismaBase } from "@/lib/prisma-base";
import { writeAuditLog } from "@/lib/audit-log";
import { getRegistry } from "./registry";
import { createPluginContext } from "./context";
import { runAsActor } from "./actor";
import { invalidatePluginCache } from "./state";
import { writePluginLog } from "./log";

const LOCK_KEY = 735_201_004; // arbitrary constant for pg advisory lock

export async function runPluginUpgrades(): Promise<void> {
  if (getRegistry().length === 0) return; // zero-plugin instances: no transaction, no queries
  // Transaction-scoped lock: released automatically on commit/rollback, on the same connection that took it.
  await prismaBase.$transaction(
    async (tx) => {
      const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(${LOCK_KEY}) AS locked`;
      if (!locked) return;
      const rows = await prismaBase.installedPlugin.findMany();
      const registry = new Map(getRegistry().map((p) => [p.definition.id, p]));
      for (const row of rows) {
        const plugin = registry.get(row.id);
        if (!plugin || compareVersions(plugin.definition.version, row.version) <= 0) continue;
        try {
          if (plugin.definition.onUpgrade) {
            const actor = { type: "plugin" as const, pluginId: row.id };
            const ctx = await createPluginContext({ plugin, actor });
            await runAsActor(actor, () => plugin.definition.onUpgrade!(ctx, row.version));
          }
          await prismaBase.installedPlugin.update({ where: { id: row.id }, data: { version: plugin.definition.version } });
          await writeAuditLog({ entityType: "plugin", entityId: row.id, action: "upgraded", changes: null, userId: null });
        } catch (e) {
          writePluginLog(row.id, "error", `onUpgrade from ${row.version} failed: ${String(e)}`);
          await prismaBase.installedPlugin.update({ where: { id: row.id }, data: { status: "DISABLED" } });
          await writeAuditLog({ entityType: "plugin", entityId: row.id, action: "disabled", changes: null, userId: null });
        }
      }
      invalidatePluginCache();
    },
    { timeout: 10 * 60_000, maxWait: 30_000 },
  );
}
