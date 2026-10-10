import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz/session";
import { writeAuditLog } from "@/lib/audit-log";
import { loadOrder, priceLine, saveDraft } from "./service";
import { isBelowList } from "./pricing";
import { notifyApprovers, notifyCreator } from "./notify";
import { can, nextStatuses, toActor } from "./transitions";
import { OrderError, type OrderStatus, type StatusAction } from "./types";

const CLEAR_APPROVAL = { approvalRequestedAt: null, approvedBy: null, approvedAt: null };

export async function auditStatus(id: string, from: string, to: OrderStatus, userId: string | null, meta: Record<string, unknown> = {}) {
  await writeAuditLog({ entityType: "order", entityId: id, action: "updated", changes: [{ field: "status", old: from, new: to, ...meta }] as never, userId });
}

/**
 * Spec § 3.4: the update only matches while the order still has the status we read
 * (and, when given, the version the user saw).
 */
export async function move(order: { id: string; status: string }, to: OrderStatus, userId: string | null, data: Record<string, unknown> = {}, meta: Record<string, unknown> = {}, seenAt?: Date) {
  const where = { id: order.id, status: order.status as OrderStatus, ...(seenAt ? { updatedAt: seenAt } : {}) };
  const res = await prismadb.crm_Orders.updateMany({ where, data: { ...data, status: to, updatedBy: userId } });
  if (res.count === 0) throw new OrderError("changed");
  await auditStatus(order.id, order.status, to, userId, meta);
}

export async function submitOrder(user: AuthzUser, id: string) {
  const order = await loadOrder(user, id);
  if (!can(order, "submit", toActor(user))) throw new OrderError("forbidden");
  if (!order.lines.length) throw new OrderError("noLines");
  const lines = await Promise.all(order.lines.map((l, i) => priceLine(order, {
    productId: l.productId, quantity: l.quantity.toString(), unitPrice: l.unitPriceOverridden ? l.unitPrice.toString() : null,
  }, i)));
  const pending = user.role === "user" && lines.some(isBelowList);
  const status = pending ? "PENDING_APPROVAL" : "READY";
  // One conditional write: a concurrent edit of the draft makes this fail with "changed" instead of
  // deciding the status on lines that are no longer the order's lines.
  await saveDraft(order, lines, user.id, { status, ...(pending ? { approvalRequestedAt: new Date() } : {}) });
  await auditStatus(order.id, "DRAFT", status, user.id);
  if (pending) await notifyApprovers(order);
  return { status } as { status: "READY" | "PENDING_APPROVAL" };
}

/** `seenAt` is the order's updatedAt the decider looked at; a newer version (withdraw, edit, resubmit) is refused. */
export async function decideApproval(user: AuthzUser, id: string, decision: "APPROVED" | "REJECTED", note?: string | null, seenAt?: string | null) {
  const order = await loadOrder(user, id);
  if (!can(order, decision === "APPROVED" ? "approve" : "reject", toActor(user))) throw new OrderError("forbidden");
  const seen = seenAt ? new Date(seenAt) : undefined;
  if (seen && (Number.isNaN(seen.getTime()) || seen.getTime() !== order.updatedAt.getTime())) throw new OrderError("changed");
  const text = note?.trim() || null;
  if (decision === "REJECTED" && !text) throw new OrderError("noteRequired");
  const status: OrderStatus = decision === "APPROVED" ? "READY" : "DRAFT";
  await move(order, status, user.id, decision === "APPROVED"
    ? { approvedBy: user.id, approvedAt: new Date(), approvalNote: text }
    : { approvalNote: text, approvalRequestedAt: null }, { decision }, seen);
  await notifyCreator(order, decision, text);
  return { status };
}

export async function changeStatus(user: AuthzUser, id: string, action: StatusAction, to?: OrderStatus) {
  const order = await loadOrder(user, id);
  const actor = toActor(user);
  if (!can(order, action, actor)) throw new OrderError("forbidden");
  let status: OrderStatus;
  let data: Record<string, unknown> = {};
  switch (action) {
    case "withdraw": status = "DRAFT"; data = { approvalRequestedAt: null }; break;
    case "reopen": status = "DRAFT"; data = CLEAR_APPROVAL; break;
    case "cancel": status = "CANCELLED"; break;
    case "retry": status = "READY"; break;
    case "advance":
      if (!to || !nextStatuses(order.status as OrderStatus).includes(to)) throw new OrderError("forbidden");
      status = to;
      break;
  }
  await move(order, status, user.id, data);
  return { status };
}
