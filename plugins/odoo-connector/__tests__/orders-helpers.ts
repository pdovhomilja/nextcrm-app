import type { RecordData } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { jsonClient } from "../odoo";
import { settingsSchema } from "../settings";
import { K } from "../store";
import { evalDomain, noSleep, type TestCtx } from "./helpers";
import { fakeOdoo } from "./fake-odoo";

export interface FakeSales {
  partners: RecordData[]; users: RecordData[]; orders: RecordData[]; lines: RecordData[];
  pickings: RecordData[]; moves: RecordData[]; lists: RecordData[];
  /** "model/method" → HTTP status returned before doing anything, or "after": do the write, then answer 500 once. */
  fail: Record<string, number | "after">;
  /** Odoo's price for sale.order.line/onchange; null = Odoo returns no price. */
  price: number | null;
  nextId: number;
  /** product.product rows (any active state) for archived variants on imported orders. */
  variants?: RecordData[];
  taxes?: RecordData[];
  /** Fields sale.order/fields_get reports (an Odoo without Inventory has no delivery_status or picking_ids). */
  saleFields?: string[];
  /** How Odoo stores a VAT number it is given (base_vat reformats it). */
  vatFormat?: (vat: string) => string;
}

const M2O = new Set(["country_id", "parent_id", "user_id", "partner_id", "partner_shipping_id", "pricelist_id", "product_id", "order_id", "currency_id"]);
const norm = (v: RecordData) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, M2O.has(k) && typeof x === "number" ? [x, `#${x}`] : x]));
const pick = (rows: RecordData[], fields?: string[]) => rows.map((r) => (fields ? Object.fromEntries(["id", ...fields].map((f) => [f, r[f] ?? false])) : r));

export function salesHandlers(s: FakeSales) {
  const guard = (key: string, write: () => unknown) => {
    const f = s.fail[key];
    if (typeof f === "number") return new Response(JSON.stringify({ message: `refused ${key}` }), { status: f });
    const out = write();
    if (f === "after") { delete s.fail[key]; return new Response("{}", { status: 500 }); }
    return out;
  };
  const search = (rows: RecordData[]) => (b: any) => {
    const active = b.context?.active_test !== false;
    const hit = rows.filter((r) => (!active || r.active !== false) && evalDomain(r, b.domain ?? []));
    return pick(hit.slice(0, b.limit ?? hit.length), b.fields);
  };
  return {
    "res.country/search_read": (b: any) => [{ id: 56, code: "CZ" }, { id: 57, code: "SK" }].filter((c) => evalDomain(c, b.domain ?? [])),
    "res.partner/fields_get": () => Object.fromEntries(["id", "name", "parent_id", "customer_rank", "active", "write_date"].map((f) => [f, {}])),
    "res.users/search_read": search(s.users),
    "res.partner/search_read": search(s.partners),
    "res.partner/read": (b: any) => pick(s.partners.filter((p) => b.ids.includes(p.id)).map((p) => ({ ...p, commercial_partner_id: p.commercial_partner_id ?? (p.parent_id ? p.parent_id : [p.id, String(p.name ?? p.id)]) })), b.fields),
    "res.partner/create": (b: any) => guard("res.partner/create", () => b.vals_list.map((v: RecordData) => {
      const id = s.nextId++;
      const row: RecordData = { id, active: true, type: "contact", parent_id: false, property_product_pricelist: [234, "Retail (CZK)"], ...norm(v) };
      if (s.vatFormat && typeof row.vat === "string") row.vat = s.vatFormat(row.vat);
      s.partners.push(row);
      return id;
    })),
    "product.pricelist/read": (b: any) => pick(s.lists.filter((l) => b.ids.includes(l.id)), b.fields),
    "sale.order/search_read": (b: any) => {
      const commercial = (o: RecordData) => {
        const pid = Array.isArray(o.partner_id) ? (o.partner_id as [number, string])[0] : (o.partner_id as number);
        const p = s.partners.find((x) => x.id === pid);
        return p?.parent_id ? (p.parent_id as [number, string])[0] : pid;
      };
      const hit = s.orders.filter((o) => evalDomain(o, b.domain ?? [], (f, r) => (f === "partner_id.commercial_partner_id" ? commercial(r) : r[f])));
      return pick(hit.slice(0, b.limit ?? hit.length), b.fields);
    },
    "sale.order/fields_get": () => Object.fromEntries((s.saleFields ?? ["id", "name", "state", "delivery_status", "invoice_status", "amount_total", "invoice_ids", "picking_ids", "partner_id", "origin", "date_order", "currency_id", "note", "write_date", "amount_untaxed"]).map((f) => [f, {}])),
    "sale.order/read": (b: any) => pick(s.orders.filter((o) => b.ids.includes(o.id)), b.fields),
    "sale.order/create": (b: any) => guard("sale.order/create", () => b.vals_list.map((v: RecordData) => {
      const id = s.nextId++;
      const { order_line, ...head } = v as { order_line: [number, number, RecordData][] };
      s.orders.push({ id, name: `S${String(id).padStart(5, "0")}`, state: "draft", invoice_ids: [], picking_ids: [], ...norm(head) });
      for (const [, , l] of order_line) s.lines.push({ id: s.nextId++, order_id: [id, "x"], display_type: false, ...norm(l) });
      return id;
    })),
    "sale.order.line/search_read": (b: any) => guard("sale.order.line/search_read", () => search(s.lines)(b)),
    "product.product/fields_get": () => Object.fromEntries(["id", "display_name", "default_code", "description_sale", "type", "active", "sale_ok", "lst_price", "standard_price", "currency_id", "taxes_id", "uom_id", "categ_id", "product_tmpl_id", "write_date"].map((f) => [f, {}])),
    "product.product/read": (b: any) => pick((s.variants ?? []).filter((v) => b.ids.includes(v.id)), b.fields),
    "account.tax/read": (b: any) => pick((s.taxes ?? []).filter((t) => b.ids.includes(t.id)), b.fields),
    "sale.order.line/fields_get": () => Object.fromEntries(["id", "order_id", "product_id", "product_uom_qty", "price_unit", "discount", "display_type", "is_downpayment"].map((f) => [f, {}])),
    "sale.order.line/onchange": () => ({ value: s.price === null ? {} : { price_unit: s.price } }),
    "stock.picking/search_read": search(s.pickings),
    "account.move/search_read": search(s.moves),
  };
}

export const account = (over: RecordData = {}): RecordData => ({
  id: "a1", name: "Bubble s.r.o.", company_id: "12345678", vat: "CZ12345678", billing_street: "Main 1", billing_city: "Praha",
  billing_postal_code: "110 00", billing_country: "CZ", email: "info@bubble.example", office_phone: "+420 111", assigned_to: "u-rep", deletedAt: null, ...over,
});

export const order = (over: RecordData = {}): RecordData => ({
  id: "o1", number: "ORD-2026-0001", status: "READY", source: "CRM", externalRef: null, accountId: "a1", ownerId: "u-rep", priceListId: null,
  currency: "CZK", shipping_street: null, shipping_city: null, shipping_postal_code: null, shipping_country: null, requestedDeliveryDate: null,
  note: null, grandTotal: "200.00", createdAt: "2026-10-13T07:00:00.000Z",
  lines: [{ productId: "p1", sku: "800009", productName: "Scoop", quantity: "2", unitPrice: "100.00" }], ...over,
});

export function mkOrders(opts: { settings?: RecordData; sales?: Partial<FakeSales>; accounts?: RecordData[]; orders?: RecordData[]; products?: RecordData[] } = {}) {
  const sales: FakeSales = {
    partners: [], users: [{ id: 9, login: "rep@x.example", email: "Rep@X.example" }], orders: [], lines: [], pickings: [], moves: [],
    lists: [{ id: 234, currency_id: [9, "CZK"] }, { id: 245, currency_id: [9, "CZK"] }, { id: 238, currency_id: [125, "EUR"] }],
    fail: {}, price: null, nextId: 1000, ...opts.sales,
  };
  const calls: { path: string; body: any }[] = [];
  const data = {
    accounts: opts.accounts ?? [account()],
    orders: opts.orders ?? [order()],
    products: opts.products ?? [{ id: "p1", source: "EXTERNAL", externalRef: "700", sku: "800009", name: "Scoop", status: "ACTIVE", deletedAt: null }],
    users: [{ id: "u-rep", email: "rep@x.example", name: "Rep One", userStatus: "ACTIVE" }],
    contacts: [] as RecordData[],
  };
  const ctx = createTestContext({
    pluginId: "odoo-connector",
    settings: settingsSchema.parse({ url: "https://odoo.example.com", database: "db", dryRun: false, sendOrders: true, ...opts.settings }),
    secrets: { apiKey: "k" }, fetch: fakeOdoo(salesHandlers(sales) as never, calls as never), data,
  }) as unknown as TestCtx;
  void ctx.store.set(K.product(700), { productId: "p1", tmplId: 70, categoryRef: null });
  const writes = () => calls.filter((c) => c.path.endsWith("/create")).map((c) => c.path.slice(8));
  return { ctx, client: jsonClient(ctx, noSleep), sales, data, calls, writes };
}
