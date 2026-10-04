import type { MessageParams } from "@nextcrm/plugin-sdk";

export class PluginRuleError extends Error {
  constructor(
    public readonly pluginId: string | null,  // null = core message (Plugins.* namespace)
    public readonly messageKey: string,
    public readonly params?: MessageParams,
    fallbackMessage?: string,
  ) {
    super(fallbackMessage ?? `Rejected by plugin rule ${pluginId ?? "core"}:${messageKey}`);
    this.name = "PluginRuleError";
  }
}

export class PluginPermissionError extends Error {
  constructor(pluginId: string, permission: string) {
    super(`Plugin ${pluginId} lacks permission ${permission}`);
    this.name = "PluginPermissionError";
  }
}

export class PluginStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PluginStoreError";
  }
}
