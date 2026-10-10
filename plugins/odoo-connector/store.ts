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
  cursor: "meta:cursor",                              // → { at: Odoo write_date }
  lastRun: "meta:lastRun",                            // → RunSummary
  failures: "meta:failures",                          // → { count }
  lock: "meta:lock",                                  // → { until: ISO }
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
export interface PriceListLink { priceListId: string; name: string; ruleCount: number; syncedAt: string }
export interface CatalogCounts {
  categories: number; productsCreated: number; productsUpdated: number; productsFailed: number;
  listsReplaced: number; listsMissing: number[]; accountLists: number;
}

export interface Conflict { partnerId: number; name: string; reason: "number" | "vat" | "linked"; candidates: string[]; foundAt: string }

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
  error?: string;
}
