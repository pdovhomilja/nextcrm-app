import type { Locale } from "@nextcrm/plugin-sdk";
import { PluginRuleError } from "./errors";
import { translatePluginMessage } from "./i18n";

export async function pluginRuleErrorMessage(error: unknown): Promise<string | null> {
  if (!(error instanceof PluginRuleError)) return null;
  let locale: Locale = "en";
  try {
    const { getLocale } = await import("next-intl/server");
    locale = (await getLocale()) as Locale;
  } catch { /* outside a request: keep en */ }
  return translatePluginMessage(error.pluginId, error.messageKey, error.params, locale);
}
