import type { RecordData } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { jsonClient } from "../odoo";
import { settingsSchema, type Ctx } from "../settings";
import type { OdooCategory, OdooRule, OdooVariant } from "../catalog-map";
import type { M2O } from "../map";
import { fakeOdoo, type Handler } from "./fake-odoo";

export type TestCtx = Ctx & { notifications: { roles?: string[]; subject: string }[]; logs: { level: string; message: string }[] };
export const now = new Date("2026-10-13T08:00:00Z");
export const noSleep = async () => {};

export interface FakeCatalog {
  categories: OdooCategory[];
  variants: OdooVariant[];
  lists: { id: number; name: string; currency_id: M2O; active?: boolean; write_date: string }[];
  items: (Partial<OdooRule> & { id: number; pricelist_id: M2O; write_date: string })[];
  taxes: { id: number; amount: number; amount_type: string }[];
}
const emptyCatalog = (): FakeCatalog => ({ categories: [], variants: [], lists: [], items: [], taxes: [] });

/** Odoo domains in Polish notation ("|" and "&" prefix two operands, implicit AND between terms); "a.b" reads a related row via `related`. */
export function evalDomain(row: RecordData, domain: any[], related: (field: string, row: RecordData) => unknown = (f, r) => r[f]): boolean {
  let i = 0;
  const term = (): boolean => {
    const t = domain[i++];
    if (t === "|") { const a = term(); const b = term(); return a || b; }
    if (t === "&") { const a = term(); const b = term(); return a && b; }
    if (t === "!") return !term();
    const [f, op, v] = t;
    const raw = related(f, row);
    const x = Array.isArray(raw) ? raw[0] : raw;
    if (op === "=") return (x === undefined ? false : x) === v;
    if (op === "!=") return (x === undefined ? false : x) !== v;
    if (op === ">") return (x ?? "") > v;
    if (op === "in") return v.includes(x);
    if (op === "not in") return !v.includes(x);
    throw new Error(op);
  };
  let ok = true;
  while (i < domain.length) ok = term() && ok;
  return ok;
}

export function catalogHandlers(c: FakeCatalog): Record<string, Handler> {
  const pick = (rows: RecordData[], fields: string[] | undefined) => rows.map((r) => (fields ? Object.fromEntries(fields.map((f) => [f, r[f] ?? false])) : r));
  const page = (rows: RecordData[], b: any) => rows.slice(b.offset ?? 0, (b.offset ?? 0) + (b.limit ?? rows.length));
  const fieldsOf = (rows: RecordData[], extra: string[]) => () => Object.fromEntries(Array.from(new Set([...rows.flatMap((r) => Object.keys(r)), ...extra])).map((f) => [f, {}]));
  const tmplWrite = (tmplId: number) => c.variants.filter((v) => v.product_tmpl_id && v.product_tmpl_id[0] === tmplId).map((v) => v.write_date).sort().pop() ?? "";
  return {
    "product.category/search_read": (b) => pick(c.categories as unknown as RecordData[], b.fields),
    "product.product/fields_get": fieldsOf([], ["id", "display_name", "default_code", "description_sale", "type", "active", "sale_ok", "lst_price", "standard_price", "currency_id", "taxes_id", "uom_id", "categ_id", "product_tmpl_id", "write_date"]),
    "product.product/search_read": (b) => {
      const activeTest = b.context?.active_test !== false;
      const rows = (c.variants as unknown as RecordData[]).filter((v) => (!activeTest || v.active !== false)
        && evalDomain(v, b.domain ?? [], (f, r) => (f === "product_tmpl_id.write_date" ? tmplWrite((r.product_tmpl_id as [number, string])[0]) : r[f])));
      return pick(page([...rows].sort((a, z) => Number(a.id) - Number(z.id)), b), b.fields);
    },
    "account.tax/read": (b) => c.taxes.filter((t) => b.ids.includes(t.id)),
    "product.pricelist/search_read": (b) => {
      const activeTest = b.context?.active_test !== false;
      return pick((c.lists as unknown as RecordData[]).filter((l) => (!activeTest || l.active !== false) && evalDomain(l, b.domain ?? [])), b.fields);
    },
    "product.pricelist.item/fields_get": fieldsOf([], ["id", "applied_on", "product_tmpl_id", "product_id", "categ_id", "min_quantity", "date_start", "date_end", "compute_price", "fixed_price", "percent_price", "base", "base_pricelist_id", "price_discount", "price_surcharge", "price_round", "price_min_margin", "price_max_margin", "write_date", "pricelist_id"]),
    "product.pricelist.item/search_read": (b) => pick((c.items as unknown as RecordData[]).filter((it) => evalDomain(it, b.domain ?? [])), b.fields),
  };
}

export function odoo(partners: RecordData[], users: RecordData[] = [{ id: 9, login: "rep@x.example", email: "Rep@X.example" }], catalog: FakeCatalog = emptyCatalog(), extra: Record<string, Handler> = {}) {
  const domainMatch = (p: RecordData, domain: any[]) => {
    // Minimal evaluator for the domains the sync sends: implicit AND with one optional "|" pair.
    const test = ([f, op, v]: any[]) => {
      const x = Array.isArray(p[f]) ? (p[f] as any[])[0] : p[f];
      if (op === "=") return (x === undefined ? false : x) === v;
      if (op === "!=") return (x === undefined ? false : x) !== v;
      if (op === ">") return (x ?? "") > v;
      if (op === "in") return v.includes(x);
      if (op === "not in") return !v.includes(x);
      throw new Error(op);
    };
    for (let i = 0; i < domain.length; i++) {
      if (domain[i] === "|") { if (!(test(domain[i + 1]) || test(domain[i + 2]))) return false; i += 2; continue; }
      if (!test(domain[i])) return false;
    }
    return true;
  };
  return fakeOdoo({
    "res.partner/fields_get": () => Object.fromEntries(["id", "name", "is_company", "company_registry", "vat", "street", "city", "zip", "country_id", "email", "phone", "function", "user_id", "parent_id", "type", "active", "customer_rank", "write_date", "property_product_pricelist"].map((f) => [f, {}])),
    ...catalogHandlers(catalog),
    ...extra,
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

export function mk(partners: RecordData[], accounts: RecordData[] = [], settings: Record<string, unknown> = {}, users: RecordData[] = [{ id: "u-rep", email: "rep@x.example", userStatus: "ACTIVE" }], extra: Record<string, Handler> = {}) {
  const ctx = createTestContext({
    pluginId: "odoo-connector",
    settings: settingsSchema.parse({ url: "https://odoo.example.com", database: "db", dryRun: false, ...settings }),
    secrets: { apiKey: "k" }, fetch: odoo(partners, undefined, undefined, extra), data: { accounts, contacts: [], users },
  }) as unknown as TestCtx;
  return { ctx, client: jsonClient(ctx, noSleep) };
}

export function mkCatalog(partners: RecordData[], catalog: FakeCatalog, settings: Record<string, unknown> = {}) {
  const data = { accounts: [] as RecordData[], contacts: [] as RecordData[], users: [{ id: "u-rep", email: "rep@x.example", userStatus: "ACTIVE" }] as RecordData[],
    products: [] as RecordData[], productCategories: [] as RecordData[], priceLists: [] as RecordData[], priceListRules: [] as RecordData[] };
  const ctx = createTestContext({
    pluginId: "odoo-connector",
    settings: settingsSchema.parse({ url: "https://odoo.example.com", database: "db", dryRun: false, ...settings }),
    secrets: { apiKey: "k" }, fetch: odoo(partners, undefined, catalog), data,
  }) as unknown as TestCtx;
  return { ctx, client: jsonClient(ctx, noSleep), data };
}

/** A context with one imported list (Odoo 245) and two imported products (Odoo 500 with a 1000-piece template rule, 501 without). */
export function mkCompare(opts: { price: number | undefined; crm?: Record<string, { price: string; currency: string; ruleId: string | null }>; priceLists?: string }) {
  const calls: { path: string; body: any; headers: Record<string, string> }[] = [];
  const catalog: FakeCatalog = {
    categories: [], variants: [], taxes: [],
    lists: [{ id: 245, name: "Gold CZK", currency_id: [9, "CZK"], write_date: "2026-10-10 08:00:00" }],
    items: [{ id: 1285, pricelist_id: [245, "Gold CZK"], applied_on: "1_product", product_tmpl_id: [912, "Lid"], compute_price: "fixed", fixed_price: 1.51, min_quantity: 1000, base: "list_price", write_date: "2026-10-10 08:00:00" }],
  };
  const fetch = fakeOdoo({
    ...catalogHandlers(catalog),
    "product.pricelist/read": () => [{ id: 245, currency_id: [9, "CZK"] }],
    "sale.order.line/onchange": () => ({ value: opts.price === undefined ? {} : { price_unit: opts.price } }),
  }, calls);
  const products: RecordData[] = [
    { id: "p500", source: "EXTERNAL", externalRef: "500", status: "ACTIVE", name: "Lid", currency: "CZK", deletedAt: null },
    { id: "p501", source: "EXTERNAL", externalRef: "501", status: "ACTIVE", name: "Straw", currency: "CZK", deletedAt: null },
  ];
  const ctx = createTestContext({
    pluginId: "odoo-connector",
    settings: settingsSchema.parse({ url: "https://odoo.example.com", database: "db", dryRun: false, priceLists: opts.priceLists ?? "245" }),
    secrets: { apiKey: "k" }, fetch, data: { products },
    prices: async ({ productId, quantity }) => opts.crm?.[`${productId.slice(1)}:${quantity}`] ?? { price: String(opts.price), currency: "CZK", ruleId: null },
  }) as unknown as TestCtx;
  void ctx.store.set("pricelist:245", { priceListId: "L245", name: "Gold CZK", ruleCount: 1, syncedAt: "2026-10-10T08:00:00Z" });
  void ctx.store.set("product:500", { productId: "p500", tmplId: 912, categoryRef: "7" });
  void ctx.store.set("product:501", { productId: "p501", tmplId: 913, categoryRef: "7" });
  void ctx.store.set("category:7", { categoryId: "c7", parentRef: null });
  return { ctx, client: jsonClient(ctx, noSleep), calls };
}
