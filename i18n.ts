import { getRequestConfig } from "next-intl/server";
import { routing } from "./i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that the incoming locale is valid
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./locales/${locale}.json`)).default,
    timeZone: "Europe/Prague",
  };
});
