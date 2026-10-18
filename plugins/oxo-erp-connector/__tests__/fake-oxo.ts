import type { OxoCustomer, OxoOrder, OxoPriceList, OxoProduct } from "../oxo";

export interface FakeOxo {
  customers: OxoCustomer[];
  products: OxoProduct[];
  lists: OxoPriceList[];
  orders: OxoOrder[];
  calls: { method: string; path: string; params: Record<string, string>; body?: any }[];
  /** Answers POST /orders; default 201 with an empty body. Return a Response for an error answer. */
  post?: (body: any) => Response | { status: number; body: unknown };
  /** Every request fails at the network level. */
  down?: boolean;
}
export const emptyOxo = (): FakeOxo => ({ customers: [], products: [], lists: [], orders: [], calls: [] });

/** A fetch for createTestContext that answers OXO ERP /api/v1 like the real one: paged (updatedAt, id), updatedSince >=, lookups by ids/odooIds. */
export function fakeOxo(s: FakeOxo) {
  return async (url: string, init?: RequestInit) => {
    if (s.down) throw new Error("connect ECONNREFUSED");
    const u = new URL(url);
    const path = u.pathname.replace(/^\/api\/v1/, "");
    const params = Object.fromEntries(u.searchParams);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    s.calls.push({ method, path, params, body });
    const json = (status: number, b: unknown) => new Response(JSON.stringify(b), { status });
    const paged = <T extends { id: number; updatedAt: string }>(rows: T[]) => {
      const since = params.updatedSince;
      const sorted = rows.filter((r) => !since || r.updatedAt >= since).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt) || a.id - b.id);
      const limit = Number(params.limit ?? 200);
      const start = params.cursor ? Number(params.cursor) : 0;
      return json(200, { items: sorted.slice(start, start + limit), nextCursor: start + limit < sorted.length ? String(start + limit) : null });
    };
    const ids = (v: string) => v.split(",").map(Number);
    if (method === "POST" && path === "/orders") {
      const r = s.post ? s.post(body) : { status: 201, body: {} };
      return r instanceof Response ? r : json(r.status, r.body);
    }
    if (path === "/customers") return paged(s.customers);
    if (path === "/products") return paged(s.products);
    if (path === "/price-lists") return json(200, { items: s.lists });
    if (path === "/orders") {
      if (params.ids) return json(200, { items: s.orders.filter((o) => ids(params.ids).includes(o.id)), nextCursor: null });
      if (params.odooIds) return json(200, { items: s.orders.filter((o) => o.odooId != null && ids(params.odooIds).includes(o.odooId)), nextCursor: null });
      return paged(s.orders.filter((o) => o.state === "sale"));
    }
    return json(404, { error: "not_found", message: `no route ${path}` });
  };
}

const T = "2026-10-18T08:00:00.000Z";
export const customer = (id: number, over: Partial<OxoCustomer> = {}): OxoCustomer => ({
  id, odooId: null, name: `Co ${id}`, ico: null, dic: null, street: null, city: null, zip: null, country: "Czech Republic",
  email: null, phone: null, priceListId: null, active: true, updatedAt: T, addresses: [], ...over,
});
export const product = (id: number, over: Partial<OxoProduct> = {}): OxoProduct => ({
  id, odooId: null, odooTemplateId: null, code: `P${id}`, name: `Product ${id}`, barcode: null, category: "Zásoby / Výrobky", unit: "ks",
  kind: "STORABLE", listPrice: "100", saleOk: true, active: true, updatedAt: T, ...over,
});
export const order = (id: number, over: Partial<OxoOrder> = {}): OxoOrder => ({
  id, odooId: null, number: `PRO${id}`, crmNumber: null, state: "sale", customerId: 1, deliveryAddressId: null, priceListId: null, currency: "CZK",
  orderedAt: "2026-10-17T10:00:00.000Z", requestedDate: null, note: null, salesRep: null, amountUntaxed: "600", updatedAt: T,
  delivery: "none", lines: [], deliveries: [], ...over,
});
