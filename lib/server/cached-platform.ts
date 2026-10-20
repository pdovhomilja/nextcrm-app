import { unstable_cache } from "next/cache";
import type { Locale, Role } from "@nextcrm/plugin-sdk";
import { getDefaultCurrency, getEnabledCurrencies } from "@/lib/currency";
import { getPluginNavItems } from "@/lib/plugins/nav";
import { getUserAccessProfile } from "@/lib/vensai/user-access";

/** Shared reference data — changes rarely (admin currencies screen). */
export const getCachedEnabledCurrencies = unstable_cache(
  () => getEnabledCurrencies(),
  ["platform-enabled-currencies-v1"],
  { revalidate: 600, tags: ["platform-currencies"] }
);

export const getCachedDefaultCurrency = unstable_cache(
  () => getDefaultCurrency(),
  ["platform-default-currency-v1"],
  { revalidate: 600, tags: ["platform-currencies"] }
);

/** Per-user nav gates (venture grants, CRM flag). */
export function getCachedUserAccessProfile(userId: string) {
  return unstable_cache(
    () => getUserAccessProfile(userId),
    ["user-access-profile-v1", userId],
    { revalidate: 120, tags: [`user-access-${userId}`] }
  )();
}

/** Plugin sidebar entries by role + locale. */
export function getCachedPluginNav(role: Role, locale: Locale) {
  return unstable_cache(
    () => getPluginNavItems(role, locale),
    ["plugin-nav-v1", role, locale],
    { revalidate: 300, tags: ["plugin-nav"] }
  )();
}
