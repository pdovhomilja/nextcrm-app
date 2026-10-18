import type { Ctx } from "./settings";
import { K } from "./store";

export interface OxoAddress { id: number; odooId: number | null; name: string; street: string | null; city: string | null; zip: string | null; country: string | null; active: boolean }
export interface OxoCustomer {
  id: number; odooId: number | null; name: string; ico: string | null; dic: string | null; street: string | null; city: string | null; zip: string | null;
  country: string | null; email: string | null; phone: string | null; priceListId: number | null; active: boolean; updatedAt: string; addresses: OxoAddress[];
}
export interface OxoProduct {
  id: number; odooId: number | null; odooTemplateId: number | null; code: string | null; name: string; barcode: string | null; category: string | null;
  unit: string | null; kind: "STORABLE" | "CONSUMABLE" | "SERVICE" | "COMBO"; listPrice: string | null; saleOk: boolean; active: boolean; updatedAt: string;
}
export interface OxoRule {
  id: number; odooId: number | null; appliesTo: "PRODUCT" | "CATEGORY" | "ALL"; productId: number | null; productTemplateOdooId: number | null;
  categoryName: string | null; minQty: string; kind: "FIXED" | "PERCENT"; fixedPrice: string | null; percent: string | null;
  base: "LIST_PRICE" | "PRICE_LIST"; basePriceListId: number | null;
}
export interface OxoPriceList { id: number; odooId: number | null; name: string; currency: string; rules: OxoRule[] }
export interface OxoOrderLine { id: number; productId: number; quantity: string; deliveredQty: string; unitPrice: string; discount: string; listPrice: string | null; belowList: boolean }
export interface OxoOrder {
  id: number; odooId: number | null; number: string; crmNumber: string | null; state: string; customerId: number; deliveryAddressId: number | null;
  priceListId: number | null; currency: string; orderedAt: string; requestedDate: string | null; note: string | null; salesRep: string | null;
  amountUntaxed: string; updatedAt: string; delivery: "none" | "partial" | "full"; lines: OxoOrderLine[];
  deliveries: { number: string; state: string; doneAt: string | null }[];
}

/** status 0 = no answer (network error, timeout); `code` is OXO ERP's error code ("invalid", "conflict", "writes_disabled", …). */
export class OxoError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string | null = null) { super(message); this.name = "OxoError"; }
}
export const isAuthError = (e: unknown) => e instanceof OxoError && (e.status === 401 || e.status === 403);

export interface OxoClient {
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  /** Every page of a paged list, following nextCursor. */
  all<T>(path: string, params?: Record<string, string>): Promise<T[]>;
  /** A write: never retried here. OXO ERP answers a repeated order with 200, so the caller may send it again later. */
  post<T>(path: string, body: unknown): Promise<{ status: number; body: T }>;
}

export function oxoClient(ctx: Ctx): OxoClient {
  const base = ctx.settings.url.replace(/\/+$/, "");
  const headers = { Authorization: `Bearer ${ctx.secrets.apiKey}`, "Content-Type": "application/json" };
  async function call(method: "GET" | "POST", path: string, params: Record<string, string> = {}, body?: unknown): Promise<{ status: number; body: unknown }> {
    const qs = new URLSearchParams(params).toString();
    let res: Response;
    try {
      res = await ctx.http.fetch(`${base}/api/v1${path}${qs ? `?${qs}` : ""}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }), timeoutMs: 30_000 });
    } catch (e) {
      throw new OxoError(`OXO ERP unreachable: ${e instanceof Error ? e.message : String(e)}`, 0);
    }
    const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
    if (!res.ok) throw new OxoError(`OXO ERP error ${res.status}: ${data?.message ?? res.statusText}`, res.status, data?.error ?? null);
    return { status: res.status, body: data };
  }
  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    return (await call("GET", path, params)).body as T;
  }
  async function all<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
    const out: T[] = [];
    let cursor: string | null = null;
    do {
      const page: { items: T[]; nextCursor: string | null } = await get(path, { ...params, limit: "500", ...(cursor ? { cursor } : {}) });
      out.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    return out;
  }
  async function post<T>(path: string, body: unknown): Promise<{ status: number; body: T }> {
    const r = await call("POST", path, {}, body);
    return { status: r.status, body: r.body as T };
  }
  return { get, all, post };
}

/** Admin action: a working key lists the price lists; it also lifts the send pause (spec § 4.5). */
export async function testConnection(ctx: Ctx, client: OxoClient = oxoClient(ctx)): Promise<string> {
  const { items } = await client.get<{ items: OxoPriceList[] }>("/price-lists");
  await ctx.store.delete(K.sendPaused);
  return ctx.t("admin.connected", { lists: items.length });
}
