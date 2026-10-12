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
  let ctx: Awaited<ReturnType<typeof createPluginContext>> | undefined;
  try {
    ctx = await createPluginContext({ plugin: found.plugin as never, actor: { type: "user", userId: user.id, role: user.role } });
    const data = await found.provider.lookup(registrationNumber.trim(), cc, ctx);
    return data ? { data } : { error: t("registryNotFound") };
  } catch (e) {
    if (ctx) ctx.log.error(`Registry lookup failed: ${String(e)}`);
    else console.error("[REGISTRY_LOOKUP]", e);
    return { error: t("registryNotFound") };
  }
}

export async function canValidateVat(): Promise<boolean> {
  await requireAuthenticated();
  return (await getCompanyRegistryProviders()).some((r) => typeof r.provider.validateVat === "function");
}

export type VatCheckResult = "valid" | "invalid" | "unavailable" | "noProvider" | "noPrefix";

// Any enabled provider with validateVat answers, whatever its countries: countries only
// says who can load company data. A throw means "cannot verify", never "invalid".
export async function validateVatNumber(vat: string): Promise<{ result: VatCheckResult }> {
  const user = await requireAuthenticated();
  const value = vat.replace(/\s+/g, "");
  if (!/^[A-Za-z]{2}/.test(value)) return { result: "noPrefix" };
  const found = (await getCompanyRegistryProviders()).find((r) => typeof r.provider.validateVat === "function");
  if (!found?.provider.validateVat) return { result: "noProvider" };
  let ctx: Awaited<ReturnType<typeof createPluginContext>> | undefined;
  try {
    ctx = await createPluginContext({ plugin: found.plugin as never, actor: { type: "user", userId: user.id, role: user.role } });
    return { result: (await found.provider.validateVat(value, ctx)) ? "valid" : "invalid" };
  } catch (e) {
    if (ctx) ctx.log.error(`VAT validation failed: ${String(e)}`);
    else console.error("[VAT_VALIDATE]", e);
    return { result: "unavailable" };
  }
}
