import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { mergePluginMessages } from "@/lib/plugins/i18n";
import type { Locale } from "@nextcrm/plugin-sdk";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: mergePluginMessages((await import(`../locales/${locale}.json`)).default, locale as Locale),
    timeZone: "Europe/Prague",
  };
});
