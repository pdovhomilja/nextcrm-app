import { prismadb } from "@/lib/prisma";
import resendHelper from "@/lib/resend";

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "";
const FROM = () => `${process.env.NEXT_PUBLIC_APP_NAME} <${process.env.EMAIL_FROM}>`;

async function enabled(): Promise<boolean> {
  const s = await prismadb.crm_SystemSettings.findUnique({ where: { key: "orders_approval_emails" } });
  return s?.value !== "false";
}

async function send(to: string[], subject: string, text: string) {
  if (!to.length) return;
  try {
    const resend = await resendHelper();
    await resend.emails.send({ from: FROM(), to, subject, text });
  } catch (error) {
    console.error("[orders] notification failed:", error);
  }
}

export async function notifyApprovers(order: { id: string; number: string }) {
  try {
    if (!(await enabled())) return;
    const users = await prismadb.users.findMany({ where: { role: { in: ["manager", "admin"] }, userStatus: "ACTIVE" }, select: { email: true } });
    await send(users.map((u) => u.email).filter(Boolean) as string[], `Order ${order.number} needs approval`,
      `Order ${order.number} has prices below the price list and waits for approval.\n${APP_URL()}/crm/orders/${order.id}`);
  } catch (error) {
    console.error("[orders] notification failed:", error);
  }
}

export async function notifyCreator(order: { id: string; number: string; createdBy: string | null }, decision: "APPROVED" | "REJECTED", note: string | null) {
  try {
    if (!order.createdBy || !(await enabled())) return;
    const user = await prismadb.users.findUnique({ where: { id: order.createdBy }, select: { email: true } });
    const verb = decision === "APPROVED" ? "approved" : "rejected";
    await send(user?.email ? [user.email] : [], `Order ${order.number} was ${verb}`,
      `Order ${order.number} was ${verb}.${note ? `\nNote: ${note}` : ""}\n${APP_URL()}/crm/orders/${order.id}`);
  } catch (error) {
    console.error("[orders] notification failed:", error);
  }
}
