import type { AppRole } from "@/lib/authz";

export type InvoiceStatus =
  | "DRAFT" | "ISSUED" | "SENT" | "PARTIALLY_PAID" | "PAID"
  | "OVERDUE" | "CANCELLED" | "DISPUTED" | "REFUNDED" | "WRITTEN_OFF";

export interface UserCtx { id: string; role: AppRole; }
export interface InvoiceCtx { status: InvoiceStatus; createdBy: string; }

export function isInvoiceImmutable(status: InvoiceStatus): boolean {
  return status !== "DRAFT";
}

function isManagerOrAdmin(user: UserCtx): boolean {
  return user.role === "manager" || user.role === "admin";
}

function isOwnerOrPrivileged(invoice: InvoiceCtx, user: UserCtx): boolean {
  return isManagerOrAdmin(user) || invoice.createdBy === user.id;
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
