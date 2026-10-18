import type { AppRole } from "@/lib/authz";
import { isManagerOrAdmin } from "@/lib/authz/roles";
import { partnerVisibleAccountWhere } from "@/lib/authz/scopes/partner";
import { NO_ROWS } from "@/lib/authz/scopes/unhandled-role";

export type InvoiceStatus =
  | "DRAFT" | "ISSUED" | "SENT" | "PARTIALLY_PAID" | "PAID"
  | "OVERDUE" | "CANCELLED" | "DISPUTED" | "REFUNDED" | "WRITTEN_OFF";

export interface UserCtx { id: string; role: AppRole; }
export interface InvoiceCtx { status: InvoiceStatus; createdBy: string; }

export function isInvoiceImmutable(status: InvoiceStatus): boolean {
  return status !== "DRAFT";
}

// Invoice list/detail scope: a `user` reads invoices he created, managers and
// admins read all (GHSA-q96c-2vj9-8v7f). A partner reads the invoices of his
// accounts (read-only: every can* below refuses him). Other roles: none.
export function invoiceReadScopeWhere(user: UserCtx): Record<string, unknown> {
  if (isManagerOrAdmin(user)) return {};
  if (user.role === "partner") return { account: partnerVisibleAccountWhere(user.id) };
  if (user.role === "user") return { createdBy: user.id };
  return { ...NO_ROWS };
}

function isOwnerOrPrivileged(invoice: InvoiceCtx, user: UserCtx): boolean {
  // Only the user role owns invoices; any other role (partner) gets nothing.
  return isManagerOrAdmin(user) || (user.role === "user" && invoice.createdBy === user.id);
}

export function canReadInvoice(invoice: InvoiceCtx, user: UserCtx): boolean {
  return isOwnerOrPrivileged(invoice, user);
}

export function canEditInvoice(invoice: InvoiceCtx, user: UserCtx): boolean {
  if (isInvoiceImmutable(invoice.status)) return false;
  return isOwnerOrPrivileged(invoice, user);
}

export function canIssueInvoice(invoice: InvoiceCtx, user: UserCtx): boolean {
  if (invoice.status !== "DRAFT") return false;
  return isOwnerOrPrivileged(invoice, user);
}

export function canCancelInvoice(invoice: InvoiceCtx, user: UserCtx): boolean {
  if (invoice.status !== "DRAFT") return false;
  return isOwnerOrPrivileged(invoice, user);
}

const PAYMENT_ALLOWED: ReadonlySet<InvoiceStatus> = new Set<InvoiceStatus>([
  "ISSUED", "SENT", "PARTIALLY_PAID", "OVERDUE",
]);

export function canAddPayment(invoice: InvoiceCtx, user: UserCtx): boolean {
  if (!PAYMENT_ALLOWED.has(invoice.status)) return false;
  return isOwnerOrPrivileged(invoice, user);
}
