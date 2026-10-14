export const K = {
  partner: (id: number) => `partner:${id}`,          // → { accountId }
  account: (id: string) => `account:${id}`,           // → AccountLink
  contact: (id: number) => `contact:${id}`,           // → { contactId }
  conflict: (id: number) => `conflict:${id}`,         // → Conflict
  retry: (id: number) => `retry:${id}`,               // → {} a partner whose last sync failed
  product: (id: number) => `product:${id}`,           // → ProductLink
  category: (id: number) => `category:${id}`,         // → { categoryId, parentRef }
  retryProduct: (id: number) => `retryProduct:${id}`, // → {} a variant whose last write failed
  pricelist: (id: number) => `pricelist:${id}`,       // → PriceListLink
  skipped: (id: number) => `skipped:${id}`,           // → { ruleId, reason }[] rules core cannot represent
  catalogCursor: "meta:catalogCursor",                // → { at: Odoo write_date }
  job: (name: "sync" | "compare") => `job:${name}`,   // → { requestedAt }
  odooLists: "meta:odooLists",                         // → { at, lists } loaded for the admin section
  compareLast: "compare:last",                         // → CompareResult
  compareProgress: "compare:progress",                 // → { done, total }
  cursor: "meta:cursor",                              // → { at: Odoo write_date }
  lastRun: "meta:lastRun",                            // → RunSummary
  failures: "meta:failures",                          // → { count }
  lock: "meta:lock",                                  // → { until: ISO }
  order: (id: string) => `order:${id}`,               // → OrderLink, a CRM order sent to Odoo
  send: (id: string) => `send:${id}`,                 // → SendState while READY and not yet sent
  failed: (id: string) => `failed:${id}`,             // → FailedState while SYNC_FAILED
  sending: (id: string) => `sending:${id}`,           // → claim, one sender per order
  sendPaused: "meta:sendPaused",                      // → { at, reason } after Odoo refused access
  created: "meta:created",                            // → CreatedRecord[] newest first, at most 20
  odooOrder: (id: number) => `odooOrder:${id}`,       // → { orderId } the CRM order of an Odoo order, sent or imported
  importFailed: (id: number) => `importFailed:${id}`, // → ImportFailed while an Odoo order cannot be imported
  customer: (accountId: string) => `customer:${accountId}`, // → CustomerInfo for the account tab
  imported: "meta:imported",                          // → { lastRun } orders imported on the last run
  indexed: "meta:indexed",                            // → { at } the 0.4.0 order index was built from order: links
};

export interface AccountLink {
  partnerId: number;
  syncedAt: string;
  salesperson: string | null;   // the Odoo salesperson's name when no CRM user matched (Needs owner)
  archived?: boolean;
  notCustomer?: boolean;
  odooPriceList?: [number, string] | null;   // the Odoo customer's price list (catalog spec § 4.4)
}

export interface ProductLink { productId: string; tmplId: number | null; categoryRef: string | null }
export interface PriceListLink { priceListId: string; name: string; ruleCount: number; syncedAt: string; isActive?: boolean }
export interface CatalogCounts {
  categories: number; productsCreated: number; productsUpdated: number; productsFailed: number;
  listsReplaced: number; listsMissing: number[]; accountLists: number;
}

export interface Conflict { partnerId: number; name: string; reason: "number" | "vat" | "linked"; candidates: string[]; foundAt: string }

export interface CompareResult {
  at: string;
  ok: boolean;
  error?: string;
  lists: { odooId: number; name: string; checked: number; failed: number }[];
  mismatches: { list: string; product: string; quantity: number; crm: string; odoo: string; diff: string; reason: "rate" | "rule"; error?: string }[];
}

export interface RunSummary {
  at: string;
  ok: boolean;
  dryRun: boolean;
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  conflicts: number;
  failed: number;
  catalog?: CatalogCounts;
  orders?: { checked: number; moved: number; imported?: number };
  error?: string;
}

export interface OrderLink {
  odooId: number; name: string; state: string; sentAt: string; total: number | null; totalDiffers: boolean;
  priceDiffs: { sku: string; crm: number; odoo: number }[];
  deliveries: { name: string; state: string; date: string | null }[];
  invoices: { number: string; type: string; date: string | null; due: string | null; amount: number; residual: number; paymentState: string }[];
  created: ("customer" | "delivery")[];
  checkedAt: string;
  done?: boolean;          // PAID or CANCELLED in the CRM: no longer read
  back?: string;           // the earlier status Odoo went back to, logged once
  missingNotified?: boolean;
  imported?: boolean;      // came from Odoo (part 3b)
  partnerId?: number;      // the Odoo customer at import
  writeDate?: string;      // Odoo write_date when the lines were last copied
  movedNotified?: boolean; // the Odoo order now belongs to another customer; admins told
  missing?: number;        // product lines left out because the product is not in the CRM (0.4.1; absent on 0.4.0 imports)
}
export interface SendState { attempts: number; lastError: string | null; waitingSince: string | null; stuckNotified?: boolean }
export interface FailedState { reason: string; at: string }
export interface CreatedRecord { at: string; kind: "customer" | "delivery"; odooId: number; name: string; orderNumber: string }
export interface ImportFailed { name: string; reason: string; at: string }
export interface OpenInvoice { number: string; type: "out_invoice" | "out_refund"; date: string | null; due: string | null; currency: string; amount: number; residual: number }
export interface CustomerInfo { at: string; invoices: OpenInvoice[]; totals: { year: number; currency: string; amount: number }[] }
