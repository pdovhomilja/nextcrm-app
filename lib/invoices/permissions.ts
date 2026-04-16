export type InvoiceStatus =
  | "DRAFT" | "ISSUED" | "SENT" | "PARTIALLY_PAID" | "PAID"
  | "OVERDUE" | "CANCELLED" | "DISPUTED" | "REFUNDED" | "WRITTEN_OFF";

interface UserCtx { id: string; isAdmin: boolean; }
interface InvoiceCtx { status: InvoiceStatus; createdBy: string; }

export function isInvoiceImmutable(status: InvoiceStatus): boolean {
  return status !== "DRAFT";
}

function isOwnerOrAdmin(invoice: InvoiceCtx, user: UserCtx): boolean {
  return user.isAdmin || invoice.createdBy === user.id;
}

export function canEditInvoice(invoice: InvoiceCtx, user: UserCtx): boolean {
  if (isInvoiceImmutable(invoice.status)) return false;
  return isOwnerOrAdmin(invoice, user);
}

export function canIssueInvoice(invoice: InvoiceCtx, user: UserCtx): boolean {
  if (invoice.status !== "DRAFT") return false;
  return isOwnerOrAdmin(invoice, user);
}

export function canCancelInvoice(invoice: InvoiceCtx, user: UserCtx): boolean {
  if (invoice.status !== "DRAFT") return false;
  return isOwnerOrAdmin(invoice, user);
}

const PAYMENT_ALLOWED: ReadonlySet<InvoiceStatus> = new Set([
  "ISSUED", "SENT", "PARTIALLY_PAID", "OVERDUE",
]);

export function canAddPayment(invoice: InvoiceCtx, user: UserCtx): boolean {
  if (!PAYMENT_ALLOWED.has(invoice.status)) return false;
  return isOwnerOrAdmin(invoice, user);
}
