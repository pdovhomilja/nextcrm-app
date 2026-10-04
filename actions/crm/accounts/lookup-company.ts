"use server";
import { getTranslations } from "next-intl/server";
import type { CompanyRecord } from "@nextcrm/plugin-sdk";
import { requireAuthenticated } from "@/lib/authz";
import { getCompanyRegistryProviders } from "@/lib/plugins/slots";
import { createPluginContext } from "@/lib/plugins/context";

export async function getRegistryCountries(): Promise<string[]> {
  await requireAuthenticated();
  const all = (await getCompanyRegistryProviders()).flatMap((r) => r.provider.countries);
  return Array.from(new Set(all)).sort();
}

export async function lookupCompany(country: string, registrationNumber: string): Promise<{ data?: CompanyRecord; error?: string }> {
  const user = await requireAuthenticated();
  const t = await getTranslations("Plugins");
  const cc = country.trim().toUpperCase();
  const found = (await getCompanyRegistryProviders()).find((r) => r.provider.countries.includes(cc));
  if (!found) return { error: t("registryNotFound") };
  const ctx = await createPluginContext({ plugin: found.plugin as never, actor: { type: "user", userId: user.id, role: user.role } });
  try {
    const data = await found.provider.lookup(registrationNumber.trim(), cc, ctx);
    return data ? { data } : { error: t("registryNotFound") };
  } catch (e) {
    ctx.log.error(`Registry lookup failed: ${String(e)}`);
    return { error: t("registryNotFound") };
  }
}
