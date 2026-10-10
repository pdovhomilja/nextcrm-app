import { definePlugin, LOCALES, satisfiesSdkRange, z } from "@nextcrm/plugin-sdk";
import { getRegistry, type RegisteredPlugin } from "@/lib/plugins/registry";
import { describeSettingsSchema } from "@/lib/plugins/settings";
import { pluginFunctionIds } from "@/lib/plugins/inngest";

jest.mock("@/inngest/client", () => ({ inngest: { createFunction: jest.fn() } }));
jest.mock("@/lib/prisma-base", () => ({ prismaBase: {} }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/plugins/context", () => ({ createPluginContext: jest.fn() }));
jest.mock("@/lib/plugins/state", () => ({ getPluginState: jest.fn(), invalidatePluginCache: jest.fn() }));
jest.mock("@/lib/plugins/log", () => ({ writePluginLog: jest.fn() }));
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
  const titles = [...d.extensions.accountTabs.map((t) => t.title), ...d.extensions.pages.map((pg) => pg.title), ...d.extensions.pages.flatMap((pg) => (pg.nav ? [pg.nav.label] : []))];
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
      id: "broken", name: "B", version: "1.0.0", sdk: "^0.3.0", description: "", permissions: [],
      settings: z.object({ list: z.array(z.string()) }),
      extensions: (x) => x.accountTab({ id: "t", title: "tab.title", component: () => null }),
    }),
  };
  expect(contractProblems(broken)).toEqual([
    "sdk ^0.3.0 not satisfied",
    "settings: Unsupported settings field type: array (list)",
    "cz missing keys: tab.title",
    "messages/de.json missing",
    "messages/uk.json missing",
  ]);
});

const CRON = /^(TZ=\S+\s+)?([\d*\/,\-A-Za-z?LW#]+\s+){4}[\d*\/,\-A-Za-z?LW#]+$/;

export function registryProblems(registry: RegisteredPlugin[]): string[] {
  const problems: string[] = [];
  const seen = new Map<string, string>();
  for (const p of registry) {
    for (const fnId of pluginFunctionIds(p)) {
      const other = seen.get(fnId);
      if (other) problems.push(`duplicate Inngest function id ${fnId} (${other}, ${p.definition.id})`);
      else seen.set(fnId, p.definition.id);
    }
    for (const c of p.definition.extensions.crons) {
      if (!CRON.test(c.schedule.trim())) problems.push(`${p.definition.id}: invalid cron "${c.schedule}" (${c.id})`);
    }
  }
  return problems;
}

it("registry has unique Inngest function ids and valid crons", () => expect(registryProblems(getRegistry())).toEqual([]));

it("registry check catches id collisions and bad crons (M10)", () => {
  const mk = (id: string, ext: (x: any) => void): RegisteredPlugin => ({
    source: "public", messages: {},
    definition: definePlugin({ id, name: id, version: "1.0.0", sdk: "^0.1.0", description: "", permissions: [], extensions: ext }),
  });
  const a = mk("aa", (x) => { x.cron("x-after", "0 3 * * *", () => {}); x.cron("X After", "every day", () => {}); });
  const b = mk("aa-cron-x", (x) => x.after("account", "created", () => {}));
  expect(registryProblems([a, b])).toEqual([
    "duplicate Inngest function id plugin-aa-cron-x-after (aa, aa)",
    'aa: invalid cron "every day" (X After)',
    "duplicate Inngest function id plugin-aa-cron-x-after (aa, aa-cron-x)",
  ]);
});
