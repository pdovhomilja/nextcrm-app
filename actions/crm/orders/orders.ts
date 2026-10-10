"use server";
import { revalidatePath } from "next/cache";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import type { AuthzUser } from "@/lib/authz";
import * as svc from "@/lib/orders/service";
import * as wf from "@/lib/orders/workflow";
import { OrderError, type HeaderInput, type LineInput, type OrderStatus, type StatusAction } from "@/lib/orders/types";

type Result<T> = { data: T } | { error: string };

async function run<T>(fn: (user: AuthzUser) => Promise<T>): Promise<Result<T>> {
  let user: AuthzUser;
  try { user = await requireAuthenticated(); } catch (e) { if (e instanceof AuthenticationError) return { error: "Unauthorized" }; throw e; }
  try {
    const data = await fn(user);
    revalidatePath("/[locale]/(routes)/crm/orders", "layout");
    return { data };
  } catch (e) {
    if (e instanceof OrderError) return { error: e.code === "pricing" ? `pricing:${e.message}` : e.code };
    throw e;
  }
}

export async function createOrder(input: { accountId: string; lines: LineInput[] } & HeaderInput) {
  return run((u) => svc.createOrder(u, input));
}
export async function updateOrder(id: string, input: HeaderInput & { lines: LineInput[] }) {
  return run((u) => svc.updateDraft(u, id, input));
}
export async function deleteOrder(id: string) {
  return run((u) => svc.deleteDraft(u, id));
}
export async function submitOrder(id: string) {
  return run((u) => wf.submitOrder(u, id));
}
export async function decideOrderApproval(id: string, decision: "APPROVED" | "REJECTED", note?: string | null) {
  return run((u) => wf.decideApproval(u, id, decision, note));
}
export async function changeOrderStatus(id: string, action: StatusAction, to?: OrderStatus) {
  return run((u) => wf.changeStatus(u, id, action, to));
}
export async function quoteLine(input: { accountId?: string; orderId?: string; productId: string; quantity: number | string }) {
  return run((u) => svc.quoteLine(u, input));
}
