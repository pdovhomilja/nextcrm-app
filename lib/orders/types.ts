export type OrderStatus =
  | "DRAFT" | "PENDING_APPROVAL" | "READY" | "SENT" | "CONFIRMED"
  | "DELIVERED" | "INVOICED" | "PAID" | "CANCELLED" | "SYNC_FAILED";
export type OrderSource = "CRM" | "EXTERNAL";

/** Forward path managers (and plugins) move along; steps may be skipped. */
export const ORDER_FLOW: OrderStatus[] = ["READY", "SENT", "CONFIRMED", "DELIVERED", "INVOICED", "PAID"];

export type OrderActor = { kind: "user"; id: string; role: "user" | "manager" | "admin" } | { kind: "plugin" };

export interface OrderState {
  status: OrderStatus;
  source: OrderSource;
  createdBy: string | null;
  externalRef: string | null;
}

export type OrderAction = "edit" | "delete" | "submit" | "approve" | "reject" | "withdraw" | "reopen" | "cancel" | "retry" | "advance";
export type StatusAction = "withdraw" | "reopen" | "cancel" | "retry" | "advance";

/** `unitPrice` is present only when a user typed it; null/undefined means "follow the price list". */
export interface LineInput {
  productId: string;
  quantity: number | string;
  unitPrice?: number | string | null;
}

export interface HeaderInput {
  contactId?: string | null;
  shipping_street?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_postal_code?: string | null;
  shipping_country?: string | null;
  requestedDeliveryDate?: string | null;
  note?: string | null;
}

export const ORDER_ERROR_CODES = [
  "notFound", "forbidden", "changed", "noLines", "productInactive",
  "noteRequired", "contactNotOnAccount", "invalid", "noSeries", "numberTaken", "pricing",
] as const;
export type OrderErrorCode = (typeof ORDER_ERROR_CODES)[number];

/** Domain error; `message` carries the engine's English text for code "pricing". */
export class OrderError extends Error {
  constructor(public readonly code: OrderErrorCode, message?: string) {
    super(message ?? code);
    this.name = "OrderError";
  }
}
