import type { Actor, Locale, PluginContext } from "@nextcrm/plugin-sdk";
import type { RegisteredPlugin } from "./registry";
import { getPluginState } from "./state";
import { decryptSecrets, parseStoredSettings } from "./settings";
import { createLogger } from "./log";
import { createStore } from "./store";
import { createHttp } from "./http";
import { createDataApi } from "./data-api";
import { sendPluginNotification } from "./notify";
import { translatePluginMessage } from "./i18n";
import { PluginPermissionError } from "./errors";

export async function createPluginContext(args: { plugin: RegisteredPlugin; actor: Actor; locale?: Locale }): Promise<PluginContext> {
  const { definition } = args.plugin;
  const locale = args.locale ?? "en";
  const log = createLogger(definition.id);
  const state = await getPluginState(definition.id);
  const settings = parseStoredSettings(definition.settings, state?.settings, (m, c) => log.warn(m, c));
  const rawSecrets = decryptSecrets(state?.secrets ?? null);
  const secrets = parseStoredSettings(definition.secrets, rawSecrets, (m, c) => log.warn(m, c));
  const has = (p: string) => definition.permissions.includes(p as never);
  const http = createHttp(log);
  return {
    plugin: { id: definition.id, version: definition.version },
    actor: args.actor,
    locale,
    settings,
    secrets,
    data: createDataApi(definition.id, definition.permissions),
    store: createStore(definition.id),
    http: {
      fetch: (url, init) => {
        if (!has("http")) throw new PluginPermissionError(definition.id, "http");
        return http.fetch(url, init);
      },
    },
    notify: async (input) => {
      if (!has("notify")) throw new PluginPermissionError(definition.id, "notify");
      await sendPluginNotification(definition.id, input);
    },
    log,
    t: (key, params) => translatePluginMessage(definition.id, key, params, locale),
  };
}
