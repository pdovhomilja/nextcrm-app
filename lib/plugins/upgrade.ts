import { compareVersions } from "@nextcrm/plugin-sdk";
import { prismaBase } from "@/lib/prisma-base";
import { writeAuditLog } from "@/lib/audit-log";
import { getRegistry } from "./registry";
import { createPluginContext } from "./context";
import { runAsActor } from "./actor";
import { invalidatePluginCache } from "./state";
import { writePluginLog } from "./log";

const LOCK_KEY = 735_201_004; // arbitrary constant for pg advisory lock

// An installed row is pending when its compiled-in registry entry is newer.
function isPending(row: { id: string; version: string }, registry: ReturnType<typeof getRegistry>): boolean {
  const plugin = registry.find((p) => p.definition.id === row.id);
  return !!plugin && compareVersions(plugin.definition.version, row.version) > 0;
}

export async function runPluginUpgrades(): Promise<void> {
  const plugins = getRegistry();
  if (plugins.length === 0) return; // zero-plugin instances: no transaction, no queries
  // Cheap pre-check outside any transaction: most cold starts have nothing to upgrade (nothing installed,
  // or every installed plugin already at its registry version), so they make one plain query and open no
  // interactive transaction. On a small serverless pool, starting a transaction can fail with P2028
  // ("Unable to start a transaction in the given time"), so don't start one when there is no work.
  const installed = await prismaBase.installedPlugin.findMany();
  if (!installed.some((row) => isPending(row, plugins))) return;
  // Transaction-scoped lock: released automatically on commit/rollback, on the same connection that took it.
  await prismaBase.$transaction(
    async (tx) => {
      const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(${LOCK_KEY}) AS locked`;
      if (!locked) return;
      // Re-read under the lock, on the lock's own connection: another replica may have upgraded since the
      // pre-check. Read-only, so it takes no row locks that an onUpgrade hook (which runs on other
      // connections) could wait on. The updates below stay on prismaBase for the same reason.
      const rows = await tx.installedPlugin.findMany();
      const registry = new Map(plugins.map((p) => [p.definition.id, p]));
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
