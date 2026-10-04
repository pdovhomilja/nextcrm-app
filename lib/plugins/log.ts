import type { PluginLogger, RecordData } from "@nextcrm/plugin-sdk";
import { prismaBase } from "@/lib/prisma-base";

export type LogLevel = "debug" | "info" | "warn" | "error";

export function writePluginLog(pluginId: string, level: LogLevel, message: string, context?: RecordData): void {
  void prismaBase.pluginLog
    .create({ data: { pluginId, level, message: message.slice(0, 2000), context: (context ?? undefined) as never } })
    .catch((e: unknown) => console.error("[PLUGIN_LOG]", pluginId, e));
}

export function createLogger(pluginId: string): PluginLogger {
  return {
    debug: (m, c) => writePluginLog(pluginId, "debug", m, c),
    info: (m, c) => writePluginLog(pluginId, "info", m, c),
    warn: (m, c) => writePluginLog(pluginId, "warn", m, c),
    error: (m, c) => writePluginLog(pluginId, "error", m, c),
  };
}
