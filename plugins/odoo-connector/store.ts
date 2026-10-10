export const K = {
  partner: (id: number) => `partner:${id}`,          // → { accountId }
  account: (id: string) => `account:${id}`,           // → AccountLink
  contact: (id: number) => `contact:${id}`,           // → { contactId }
  conflict: (id: number) => `conflict:${id}`,         // → Conflict
  retry: (id: number) => `retry:${id}`,               // → {} a partner whose last sync failed
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
  error?: string;
}
