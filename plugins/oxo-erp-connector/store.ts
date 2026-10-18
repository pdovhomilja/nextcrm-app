import type { OxoAddress, OxoCustomer, OxoOrder } from "./oxo";

export const K = {
  customer: (id: number) => `customer:${id}`,              // → { accountId }
  account: (id: string) => `account:${id}`,                 // → AccountLink
  conflict: (id: number) => `conflict:${id}`,               // → Conflict (holds the customer; re-tried every run)
  retry: (id: number) => `retry:${id}`,                     // → { customer } a customer whose last write failed
  product: (crmId: string) => `product:${crmId}`,           // → ProductLink
  retryProduct: (id: number) => `retryProduct:${id}`,       // → { product } a product whose last write failed
  pricelist: (id: number) => `pricelist:${id}`,             // → PriceListLink, keyed by the OXO ERP list id
  skipped: (id: number) => `skipped:${id}`,                 // → { ruleId, reason }[]
  order: (crmId: string) => `order:${crmId}`,               // → OrderLink
  pending: (id: number) => `pending:${id}`,                 // → { order } an OXO ERP order whose customer is not linked yet
  send: (crmId: string) => `send:${crmId}`,                 // → SendState while READY and waiting for OXO ERP
  failed: (crmId: string) => `failed:${crmId}`,             // → FailedState while SYNC_FAILED
  sending: (crmId: string) => `sending:${crmId}`,           // → claim, one sender per order
  cursor: (kind: "customers" | "products" | "orders") => `meta:cursor:${kind}`, // → { at: ISO updatedAt }
  lock: "meta:lock",                                        // → { until: ISO }
  lastRun: "meta:lastRun",                                  // → RunSummary
  report: "meta:report",                                    // → RunSummary of the last dry run
  failures: "meta:failures",                                // → { count }
  sendPaused: "meta:sendPaused",                            // → { at, reason }
  job: "job:sync",                                          // → { requestedAt }
  oxoLists: "meta:oxoLists",                                // → { at, lists } for the admin section
};

export const LOCK_MS = 10 * 60_000;
/** A long run renews its lock, so the next cron cannot start a second run next to it. */
export const keepLock = (ctx: { store: { set(key: string, value: unknown): Promise<void> } }) =>
  ctx.store.set(K.lock, { until: new Date(Date.now() + LOCK_MS).toISOString() });

export interface AccountLink { customerId: number; syncedAt: string; priceListId: number | null; addresses: OxoAddress[]; inactive?: boolean }
export type MatchReason = "number" | "vat" | "name" | "linked";
export interface Conflict { customerId: number; name: string; reason: MatchReason; candidates: string[]; foundAt: string; customer: OxoCustomer }
export interface ProductLink { oxoId: number; ref: string; templateId: number | null; categoryRef: string | null }
export interface PriceListLink { priceListId: string; ref: string; name: string; currency: string; hash: string; syncedAt: string; isActive: boolean }
export interface OrderLink {
  oxoId: number; number: string; state: string; delivery: OxoOrder["delivery"]; deliveries: OxoOrder["deliveries"];
  belowList: string[];   // lines OXO ERP priced below list (SKU or name)
  sentAt: string; checkedAt: string;
  imported?: boolean; updatedAt?: string; missing?: number; missingNotified?: boolean;
}
export interface SendState { lastError: string; waitingSince: string; stuckNotified?: boolean }
export interface FailedState { reason: string; at: string }

export interface CustomerCounts { linked: number; number: number; vat: number; name: number; created: number; updated: number; conflicts: number; skipped: number; failed: number }
export interface CatalogCounts {
  categoriesMatched: number; categoriesCreated: number; productsUpdated: number; productsCreated: number; productsFailed: number;
  listsReplaced: number; listsMissing: number[]; accountLists: number;
}
export interface OrderCounts { checked: number; moved: number; imported: number; updated: number; pending: number }
export interface ReportRow { customerId: number; name: string; accountId?: string; reason?: MatchReason; candidates?: string[] }
export interface RunSummary {
  at: string; ok: boolean; dryRun: boolean; error?: string;
  customers: CustomerCounts; catalog?: CatalogCounts; orders?: OrderCounts;
  rows: { name: ReportRow[]; created: ReportRow[]; conflicts: ReportRow[] };   // at most 200 each
}
