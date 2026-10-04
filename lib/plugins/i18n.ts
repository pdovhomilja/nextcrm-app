import { createTranslator } from "next-intl";
import type { Locale, MessageParams } from "@nextcrm/plugin-sdk";
import { getRegistry } from "./registry";
import en from "@/locales/en.json";
import cz from "@/locales/cz.json";
import de from "@/locales/de.json";
import uk from "@/locales/uk.json";

const CORE = { en, cz, de, uk } as Record<Locale, Record<string, unknown>>;

export function mergePluginMessages<T extends Record<string, unknown>>(base: T, locale: Locale): T & { plugins: Record<string, unknown> } {
  const plugins: Record<string, unknown> = {};
  for (const p of getRegistry()) {
    const msgs = p.messages[locale] ?? p.messages.en;
    if (msgs) plugins[p.definition.id] = msgs;
  }
  return { ...base, plugins };
}

export function translatePluginMessage(pluginId: string | null, key: string, params: MessageParams | undefined, locale: Locale): string {
  const messages = mergePluginMessages(CORE[locale] ?? CORE.en, locale);
  const namespace = pluginId ? `plugins.${pluginId}` : "Plugins";
  try {
    const fail = () => { throw new Error("missing"); };
    const t = createTranslator({ locale, messages, namespace: namespace as never, onError: fail, getMessageFallback: fail });
    return t(key as never, params as never);
  } catch {
    return `${pluginId ?? "core"}:${key}`;
  }
}
