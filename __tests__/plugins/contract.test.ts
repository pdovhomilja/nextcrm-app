import { definePlugin, LOCALES, satisfiesSdkRange, z } from "@nextcrm/plugin-sdk";
import { getRegistry, type RegisteredPlugin } from "@/lib/plugins/registry";
import { describeSettingsSchema } from "@/lib/plugins/settings";

jest.mock("@/lib/email-crypto", () => ({ encrypt: (s: string) => s, decrypt: (s: string) => s }));

function keys(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

export function contractProblems(p: RegisteredPlugin): string[] {
  const problems: string[] = [];
  const d = p.definition;
  if (!satisfiesSdkRange(d.sdk)) problems.push(`sdk ${d.sdk} not satisfied`);
  for (const [name, schema] of [["settings", d.settings], ["secrets", d.secrets]] as const) {
    try { describeSettingsSchema(schema); } catch (e) { problems.push(`${name}: ${(e as Error).message}`); }
  }
  const en = p.messages.en;
  if (!en) problems.push("messages/en.json missing");
  for (const loc of LOCALES) {
    const m = p.messages[loc];
    if (!m) { problems.push(`messages/${loc}.json missing`); continue; }
    const missing = keys(en).filter((k) => !keys(m).includes(k));
    if (missing.length) problems.push(`${loc} missing keys: ${missing.join(", ")}`);
  }
  const titles = [...d.extensions.accountTabs.map((t) => t.title), ...d.extensions.pages.map((pg) => pg.title)];
  for (const title of titles) if (en && !keys(en).includes(title)) problems.push(`en missing title key: ${title}`);
  return problems;
}

for (const plugin of getRegistry()) {
  describe(`plugin ${plugin.definition.id}`, () => {
    it("meets the plugin contract", () => expect(contractProblems(plugin)).toEqual([]));
  });
}

it("contract catches broken plugins", () => {
  const broken: RegisteredPlugin = {
    source: "public",
    messages: { en: { tab: { title: "T" } }, cz: {} },
    definition: definePlugin({
      id: "broken", name: "B", version: "1.0.0", sdk: "^0.2.0", description: "", permissions: [],
      settings: z.object({ list: z.array(z.string()) }),
      extensions: (x) => x.accountTab({ id: "t", title: "tab.title", component: () => null }),
    }),
  };
  expect(contractProblems(broken)).toEqual([
    "sdk ^0.2.0 not satisfied",
    "settings: Unsupported settings field type: array (list)",
    "cz missing keys: tab.title",
    "messages/de.json missing",
    "messages/uk.json missing",
  ]);
});
