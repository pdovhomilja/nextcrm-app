import { inngest } from "@/inngest/client";
import { prismaBase } from "@/lib/prisma-base";
import { writeAuditLog } from "@/lib/audit-log";
import type { PluginContext } from "@nextcrm/plugin-sdk";
import type { InngestFunction } from "inngest";
import { getRegistry, findPlugin, type RegisteredPlugin } from "./registry";
import { getPluginState, invalidatePluginCache } from "./state";
import { createPluginContext } from "./context";
import { runAsActor } from "./actor";
import { writePluginLog } from "./log";

const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

export async function runIfEnabled(plugin: RegisteredPlugin, fn: (ctx: PluginContext) => Promise<unknown> | unknown) {
  const state = await getPluginState(plugin.definition.id);
  if (state?.status !== "ENABLED") return { status: "skipped:disabled" as const };
  const actor = { type: "plugin" as const, pluginId: plugin.definition.id };
  const ctx = await createPluginContext({ plugin, actor });
  try {
    await runAsActor(actor, () => fn(ctx));
  } catch (e) {
    ctx.log.error(`Job failed: ${String(e)}`);
    throw e;   // Inngest retries
  }
  return { status: "ok" as const };
}

export function buildPluginFunctions(registry: RegisteredPlugin[]) {
  const fns: InngestFunction.Any[] = [];
  for (const plugin of registry) {
    const { id, extensions } = plugin.definition;
    for (const cron of extensions.crons) {
      fns.push(inngest.createFunction(
        { id: `plugin-${id}-cron-${slug(cron.id)}`, name: `Plugin ${id}: ${cron.id}`, retries: 3, triggers: [{ cron: cron.schedule }] },
        async () => runIfEnabled(plugin, (ctx) => cron.handler(ctx)),
      ));
    }
    for (const ev of extensions.events) {
      fns.push(inngest.createFunction(
        { id: `plugin-${id}-on-${slug(ev.event)}`, name: `Plugin ${id}: on ${ev.event}`, retries: 3, triggers: [{ event: ev.event }] },
        async ({ event }: { event: { data: Record<string, unknown> } }) =>
          // Loop guard: skip events caused by this plugin's own ctx.data writes.
          event.data?.source === id ? { status: "skipped:self" as const } : runIfEnabled(plugin, (ctx) => ev.handler(event.data, ctx)),
      ));
    }
    if (extensions.afters.length) {
      fns.push(inngest.createFunction(
        { id: `plugin-${id}-after`, name: `Plugin ${id}: after write`, retries: 3, triggers: [{ event: `plugin/${id}/after` }] },
        async ({ event }: { event: { data: { entity: string; operation: string; recordId: string } } }) =>
          runIfEnabled(plugin, async (ctx) => {
            for (const a of extensions.afters) {
              if (a.entity === event.data.entity && a.operation === event.data.operation) {
                await a.handler(event.data as never, ctx);
              }
            }
          }),
      ));
    }
  }
  return fns;
}

export const pluginInstallFunction = inngest.createFunction(
  { id: "plugin-lifecycle-install", name: "Plugin install", retries: 0, triggers: [{ event: "plugin/installed" }] },
  async ({ event }: { event: { data: { pluginId: string } } }) => {
    const plugin = findPlugin(event.data.pluginId);
    if (!plugin?.definition.onInstall) return { status: "ok" };
    try {
      const actor = { type: "plugin" as const, pluginId: plugin.definition.id };
      const ctx = await createPluginContext({ plugin, actor });
      await runAsActor(actor, () => plugin.definition.onInstall!(ctx));
      return { status: "ok" };
    } catch (e) {
      writePluginLog(plugin.definition.id, "error", `onInstall failed: ${String(e)}`);
      // updateMany: the plugin may have been uninstalled while the job ran.
      await prismaBase.installedPlugin.updateMany({ where: { id: plugin.definition.id }, data: { status: "DISABLED" } });
      await writeAuditLog({ entityType: "plugin", entityId: plugin.definition.id, action: "disabled", changes: null, userId: null });
      invalidatePluginCache();
      return { status: "failed" };
    }
  },
);

export const pluginLogRetention = inngest.createFunction(
  { id: "plugin-log-retention", name: "Plugin log retention", triggers: [{ cron: "30 3 * * *" }] },
  async () => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { count } = await prismaBase.pluginLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return { deleted: count };
  },
);

export function getPluginFunctions() {
  return [...buildPluginFunctions(getRegistry()), pluginInstallFunction, pluginLogRetention];
}
