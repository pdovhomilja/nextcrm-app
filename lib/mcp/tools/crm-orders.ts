import { z } from "zod";
import type { AuthzUser } from "@/lib/authz";
import { createOrder, listOrders, loadOrder, updateDraft } from "@/lib/orders/service";
import { changeStatus, decideApproval, submitOrder } from "@/lib/orders/workflow";
import { serializeOrder } from "@/lib/orders/serialize";
import { toActor } from "@/lib/orders/transitions";
import { OrderError, type OrderStatus } from "@/lib/orders/types";
import { paginationSchema, listResponse, itemResponse, notFound, forbidden, conflict, validationError } from "../helpers";

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (!(e instanceof OrderError)) throw e;
    if (e.code === "notFound") notFound("Order");
    if (e.code === "forbidden") forbidden();
    if (e.code === "changed") conflict("the order changed");
    return validationError(e.code === "pricing" ? e.message : e.code);
  }
}

const STATUSES = ["DRAFT", "PENDING_APPROVAL", "READY", "SENT", "CONFIRMED", "DELIVERED", "INVOICED", "PAID", "CANCELLED", "SYNC_FAILED"] as const;
const lineSchema = z.object({ productId: z.string(), quantity: z.number().positive(), unitPrice: z.number().min(0).nullable().optional() });
const headerSchema = {
  contactId: z.string().nullable().optional(),
  shipping_street: z.string().nullable().optional(),
  shipping_city: z.string().nullable().optional(),
  shipping_state: z.string().nullable().optional(),
  shipping_postal_code: z.string().nullable().optional(),
  shipping_country: z.string().nullable().optional(),
  requestedDeliveryDate: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
};

export const crmOrderTools = [
  {
    name: "crm_list_orders",
    description: "List orders you can see, newest first",
    schema: z.object({ status: z.enum(STATUSES).optional(), accountId: z.string().optional(), ownerId: z.string().optional(), ...paginationSchema }),
    async handler(args: { status?: string; accountId?: string; ownerId?: string; limit: number; offset: number }, _userId: string, user: AuthzUser) {
      const { data, total } = await listOrders(user, args);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_order",
    description: "Get an order with its lines and the actions you may take",
    schema: z.object({ id: z.string() }),
    async handler(args: { id: string }, _userId: string, user: AuthzUser) {
      return guard(async () => itemResponse(serializeOrder(await loadOrder(user, args.id), toActor(user))));
    },
  },
  {
    name: "crm_create_order",
    description: "Create a draft order for an account; lines are priced from the customer's price list unless unitPrice is given",
    schema: z.object({ accountId: z.string(), lines: z.array(lineSchema), ...headerSchema }),
    async handler(args: { accountId: string; lines: z.infer<typeof lineSchema>[] }, _userId: string, user: AuthzUser) {
      return guard(async () => itemResponse(await createOrder(user, args)));
    },
  },
  {
    name: "crm_update_order",
    description: "Replace a draft order's header fields and full line list",
    schema: z.object({ id: z.string(), lines: z.array(lineSchema), ...headerSchema }),
    async handler(args: { id: string; lines: z.infer<typeof lineSchema>[] }, _userId: string, user: AuthzUser) {
      const { id, ...input } = args;
      return guard(async () => itemResponse(await updateDraft(user, id, input)));
    },
  },
  {
    name: "crm_submit_order",
    description: "Submit a draft: READY, or PENDING_APPROVAL when a sales rep priced a line below the list",
    schema: z.object({ id: z.string() }),
    async handler(args: { id: string }, _userId: string, user: AuthzUser) {
      return guard(async () => itemResponse(await submitOrder(user, args.id)));
    },
  },
  {
    name: "crm_decide_order_approval",
    description: "Approve or reject an order waiting for approval (manager or admin; a note is required to reject). Pass the order's updatedAt from crm_get_order to approve exactly the version you reviewed.",
    schema: z.object({ id: z.string(), decision: z.enum(["APPROVED", "REJECTED"]), note: z.string().nullable().optional(), updatedAt: z.string().optional() }),
    async handler(args: { id: string; decision: "APPROVED" | "REJECTED"; note?: string | null; updatedAt?: string }, _userId: string, user: AuthzUser) {
      return guard(async () => itemResponse(await decideApproval(user, args.id, args.decision, args.note, args.updatedAt)));
    },
  },
  {
    name: "crm_set_order_status",
    description: "Withdraw, reopen, retry, or advance an order to a later status (advance needs `to`)",
    schema: z.object({ id: z.string(), action: z.enum(["withdraw", "reopen", "retry", "advance"]), to: z.enum(STATUSES).optional() }),
    async handler(args: { id: string; action: "withdraw" | "reopen" | "retry" | "advance"; to?: OrderStatus }, _userId: string, user: AuthzUser) {
      return guard(async () => itemResponse(await changeStatus(user, args.id, args.action, args.to)));
    },
  },
  {
    name: "crm_cancel_order",
    description: "Cancel an order",
    schema: z.object({ id: z.string() }),
    async handler(args: { id: string }, _userId: string, user: AuthzUser) {
      return guard(async () => itemResponse(await changeStatus(user, args.id, "cancel")));
    },
  },
];
