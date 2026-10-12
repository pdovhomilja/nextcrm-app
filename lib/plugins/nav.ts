import type { Locale, Role } from "@nextcrm/plugin-sdk";
import { getEnabledPlugins } from "./state";
import { translatePluginMessage } from "./i18n";

export async function getPluginNavItems(role: Role, locale: Locale): Promise<{ title: string; url: string }[]> {
  const out: { title: string; url: string }[] = [];
  for (const plugin of await getEnabledPlugins()) {
    const id = plugin.definition.id;
    for (const page of plugin.definition.extensions.pages) {
      if (!page.nav || !page.roles.includes(role)) continue;
      out.push({ title: translatePluginMessage(id, page.nav.label, undefined, locale), url: `/p/${id}/${page.path}` });
    }
  }
  return out;
}
