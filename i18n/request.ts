import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { mergePluginMessages } from "@/lib/plugins/i18n";
import type { Locale } from "@nextcrm/plugin-sdk";
import en from "../locales/en.json";

type Messages = Record<string, unknown>;

// Keys missing from a locale file fall back to English instead of showing the raw key.
function withFallback(fallback: Messages, messages: Messages): Messages {
  const out: Messages = { ...fallback };
  for (const [key, value] of Object.entries(messages)) {
    const base = out[key];
    out[key] =
      value && typeof value === "object" && base && typeof base === "object"
        ? withFallback(base as Messages, value as Messages)
        : value;
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: mergePluginMessages(withFallback(en, (await import(`../locales/${locale}.json`)).default), locale as Locale),
    timeZone: "Europe/Prague",
  };
});
