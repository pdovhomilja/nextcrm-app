import { ORDER_FLOW, type OrderAction, type OrderActor, type OrderState, type OrderStatus } from "./types";

const ACTIONS: OrderAction[] = ["edit", "delete", "submit", "approve", "reject", "withdraw", "reopen", "cancel", "retry", "advance"];
const MANAGER_CANCELS: OrderStatus[] = ["SENT", "CONFIRMED", "DELIVERED", "INVOICED", "SYNC_FAILED"];
const PLUGIN_TARGETS = new Set<OrderStatus>(["SENT", "CONFIRMED", "DELIVERED", "INVOICED", "PAID", "SYNC_FAILED", "CANCELLED"]);
const PLUGIN_FROZEN = new Set<OrderStatus>(["DRAFT", "PENDING_APPROVAL", "PAID", "CANCELLED"]);

export function toActor(user: { id: string; role: string }): OrderActor {
  const role = user.role === "admin" || user.role === "manager" ? user.role : "user";
  return { kind: "user", id: user.id, role };
}

const isManager = (a: OrderActor) => a.kind === "user" && a.role !== "user";
const isCreator = (o: OrderState, a: OrderActor) => a.kind === "user" && !!o.createdBy && o.createdBy === a.id;

export function nextStatuses(status: OrderStatus): OrderStatus[] {
  const i = ORDER_FLOW.indexOf(status);
  return i < 0 ? [] : ORDER_FLOW.slice(i + 1);
}

/** Spec § 3.1–3.2: what a user may do with an order. Plugins use canPluginSet instead. */
export function can(order: OrderState, action: OrderAction, actor: OrderActor): boolean {
  if (actor.kind === "plugin" || order.source === "EXTERNAL") return false;
  const owner = isCreator(order, actor) || isManager(actor);
  switch (action) {
    case "edit":
    case "delete":
    case "submit":
      return order.status === "DRAFT" && owner;
    case "approve":
    case "reject":
      return order.status === "PENDING_APPROVAL" && isManager(actor);
    case "withdraw":
      return order.status === "PENDING_APPROVAL" && isCreator(order, actor);
    case "reopen":
      return order.status === "READY" && owner && !order.externalRef;
    case "cancel":
      return ((order.status === "PENDING_APPROVAL" || order.status === "READY") && owner)
        || (MANAGER_CANCELS.includes(order.status) && isManager(actor));
    case "retry":
      return order.status === "SYNC_FAILED" && isManager(actor);
    case "advance":
      return isManager(actor) && nextStatuses(order.status).length > 0;
  }
}

export function allowedActions(order: OrderState, actor: OrderActor): OrderAction[] {
  return ACTIONS.filter((a) => can(order, a, actor));
}

/** Spec § 3.3 + Ruling 1: plugins set forward/failure statuses, never on drafts, pending or final orders. */
export function canPluginSet(order: OrderState, to: OrderStatus): boolean {
  return !PLUGIN_FROZEN.has(order.status) && PLUGIN_TARGETS.has(to) && to !== order.status;
}
