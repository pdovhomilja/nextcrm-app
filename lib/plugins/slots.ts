import type { AccountPanelRegistration, AccountTabRegistration, CompanyRegistryProvider, OrderPanelRegistration, PageRegistration, ProductPanelRegistration, Role } from "@nextcrm/plugin-sdk";
import type { RegisteredPlugin } from "./registry";
import { getEnabledPlugins } from "./state";

export async function getAccountTabs(role: Role) {
  const out: { plugin: RegisteredPlugin; tab: AccountTabRegistration }[] = [];
  for (const plugin of await getEnabledPlugins()) {
    for (const tab of plugin.definition.extensions.accountTabs) if (tab.roles.includes(role)) out.push({ plugin, tab });
  }
  return out;
}

export async function getAccountPanels(role: Role) {
  const out: { plugin: RegisteredPlugin; panel: AccountPanelRegistration }[] = [];
  for (const plugin of await getEnabledPlugins()) {
    for (const panel of plugin.definition.extensions.accountPanels) if (panel.roles.includes(role)) out.push({ plugin, panel });
  }
  return out;
}

export async function getOrderPanels(role: Role) {
  const out: { plugin: RegisteredPlugin; panel: OrderPanelRegistration }[] = [];
  for (const plugin of await getEnabledPlugins()) {
    for (const panel of plugin.definition.extensions.orderPanels) if (panel.roles.includes(role)) out.push({ plugin, panel });
  }
  return out;
}

export async function getProductPanels(role: Role) {
  const out: { plugin: RegisteredPlugin; panel: ProductPanelRegistration }[] = [];
  for (const plugin of await getEnabledPlugins()) {
    for (const panel of plugin.definition.extensions.productPanels) if (panel.roles.includes(role)) out.push({ plugin, panel });
  }
  return out;
}

export async function findPluginPage(pluginId: string, path: string[], role: Role) {
  const plugin = (await getEnabledPlugins()).find((p) => p.definition.id === pluginId);
  const page = plugin?.definition.extensions.pages.find((p) => p.path === path.join("/"));
  if (!plugin || !page || !page.roles.includes(role)) return null;
  return { plugin, page } as { plugin: RegisteredPlugin; page: PageRegistration };
}

export async function getCompanyRegistryProviders() {
  const out: { plugin: RegisteredPlugin; provider: CompanyRegistryProvider }[] = [];
  for (const plugin of await getEnabledPlugins()) {
    for (const provider of plugin.definition.extensions.companyRegistries) out.push({ plugin, provider });
  }
  return out;
}
