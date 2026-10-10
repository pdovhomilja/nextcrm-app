import type { RecordData } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { jsonClient } from "../odoo";
import { settingsSchema, type Ctx } from "../settings";
import { fakeOdoo } from "./fake-odoo";

export type TestCtx = Ctx & { notifications: { roles?: string[]; subject: string }[]; logs: { level: string; message: string }[] };
export const now = new Date("2026-10-13T08:00:00Z");
export const noSleep = async () => {};

export function odoo(partners: RecordData[], users: RecordData[] = [{ id: 9, login: "rep@x.example", email: "Rep@X.example" }]) {
  const domainMatch = (p: RecordData, domain: any[]) => {
    // Minimal evaluator for the domains the sync sends: implicit AND with one optional "|" pair.
    const test = ([f, op, v]: any[]) => {
      const x = Array.isArray(p[f]) ? (p[f] as any[])[0] : p[f];
      if (op === "=") return (x === undefined ? false : x) === v;
      if (op === "!=") return (x === undefined ? false : x) !== v;
      if (op === ">") return (x ?? "") > v;
      if (op === "in") return v.includes(x);
      throw new Error(op);
    };
    for (let i = 0; i < domain.length; i++) {
      if (domain[i] === "|") { if (!(test(domain[i + 1]) || test(domain[i + 2]))) return false; i += 2; continue; }
      if (!test(domain[i])) return false;
    }
    return true;
  };
  return fakeOdoo({
    "res.partner/fields_get": () => Object.fromEntries(["id", "name", "is_company", "company_registry", "vat", "street", "city", "zip", "country_id", "email", "phone", "function", "user_id", "parent_id", "type", "active", "customer_rank", "write_date"].map((f) => [f, {}])),
    "res.country/search_read": () => [{ id: 56, code: "CZ" }],
    "res.users/read": (b) => users.filter((u) => b.ids.includes(u.id)),
    "res.partner/search_read": (b) => {
      const activeTest = b.context?.active_test !== false;
      const rows = partners.filter((p) => (!activeTest || p.active !== false) && domainMatch(p, b.domain));
      const sorted = b.order?.startsWith("write_date") ? [...rows].sort((a, c) => String(a.write_date).localeCompare(String(c.write_date)) || Number(a.id) - Number(c.id)) : [...rows].sort((a, c) => Number(a.id) - Number(c.id));
      return sorted.slice(b.offset ?? 0, (b.offset ?? 0) + (b.limit ?? sorted.length)).map((p) => Object.fromEntries(b.fields.map((f: string) => [f, p[f] ?? false])));
    },
  });
}
export const company = (id: number, over: RecordData = {}) => ({ id, name: `Co ${id}`, is_company: true, company_registry: false, vat: false, country_id: [56, "Czechia"], email: false, phone: false, user_id: [9, "Rep"], parent_id: false, type: "contact", active: true, customer_rank: 1, write_date: "2026-10-10 08:00:00", ...over });
export const person = (id: number, parent: number, over: RecordData = {}) => ({ id, name: `Jan Person${id}`, is_company: false, email: `p${id}@x.example`, parent_id: [parent, "Co"], type: "contact", active: true, customer_rank: 0, write_date: "2026-10-10 08:00:00", ...over });

export function mk(partners: RecordData[], accounts: RecordData[] = [], settings: Record<string, unknown> = {}, users: RecordData[] = [{ id: "u-rep", email: "rep@x.example", userStatus: "ACTIVE" }]) {
  const ctx = createTestContext({
    pluginId: "odoo-connector",
    settings: settingsSchema.parse({ url: "https://odoo.example.com", database: "db", dryRun: false, ...settings }),
    secrets: { apiKey: "k" }, fetch: odoo(partners), data: { accounts, contacts: [], users },
  }) as unknown as TestCtx;
  return { ctx, client: jsonClient(ctx, noSleep) };
}
