"use server";

import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import resendHelper from "@/lib/resend";
import { writeAuditLog } from "@/lib/audit-log";
import {
  requireAuthenticated,
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "";
const FROM = () =>
  `${process.env.NEXT_PUBLIC_APP_NAME} <${process.env.EMAIL_FROM}>`;

async function notify(to: string[], subject: string, text: string) {
  if (to.length === 0) return;
  try {
    const resend = await resendHelper();
    await resend.emails.send({ from: FROM(), to, subject, text });
  } catch (error) {
    console.error("[approval] notification failed:", error);
  }
}

// Spec §3.5: rep submits the SOW/quote for CSO approval before it goes out.
export async function requestApproval(
  opportunityId: string,
): Promise<{ error?: string }> {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  const deal = await prismadb.crm_Opportunities.findFirst({
    where: { id: opportunityId, deletedAt: null },
  });
  if (!deal) return { error: "Opportunity not found" };
  if (deal.approval_status === "PENDING")
    return { error: "Approval is already pending for this deal." };
  if (deal.approval_status === "APPROVED")
    return { error: "This deal is already approved." };

  await prismadb.crm_Opportunities.update({
    where: { id: opportunityId },
    data: {
      approval_status: "PENDING",
      approval_requested_at: new Date(),
      approval_note: null,
      updatedBy: user.id,
    },
  });
  await writeAuditLog({
    entityType: "opportunity",
    entityId: opportunityId,
    action: "updated",
    changes: [
      { field: "approval_status", old: deal.approval_status, new: "PENDING" },
    ],
    userId: user.id,
  });

  const approvers = await prismadb.users.findMany({
    where: { role: { in: ["manager", "admin"] }, userStatus: "ACTIVE" },
    select: { email: true },
  });
  await notify(
    approvers.map((a) => a.email).filter(Boolean) as string[],
    `Approval requested: ${deal.name ?? opportunityId}`,
    `A quote/SOW approval was requested for "${deal.name ?? opportunityId}".\n` +
      `Review the queue: ${APP_URL()}/crm/approvals\n` +
      `Deal: ${APP_URL()}/crm/opportunities/${opportunityId}\n` +
      `(The SOW/quote should be attached to the deal's documents.)`,
  );

  revalidatePath("/[locale]/(routes)/crm/opportunities", "page");
  return {};
}

// CSO decision — managers and admins only (2026-07-19 decision).
export async function decideApproval(
  opportunityId: string,
  decision: "APPROVED" | "REJECTED",
  note?: string,
): Promise<{ error?: string }> {
  let approver;
  try {
    approver = await requireRole(["manager", "admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError || e instanceof AuthorizationError) {
      return { error: "Forbidden" };
    }
    throw e;
  }
  if (decision !== "APPROVED" && decision !== "REJECTED")
    return { error: "Invalid decision" };

  const deal = await prismadb.crm_Opportunities.findFirst({
    where: { id: opportunityId, deletedAt: null },
  });
  if (!deal) return { error: "Opportunity not found" };
  if (deal.approval_status !== "PENDING")
    return { error: "This deal has no pending approval request." };

  const trimmedNote = note?.trim().slice(0, 1000) || null;
  await prismadb.crm_Opportunities.update({
    where: { id: opportunityId },
    data: {
      approval_status: decision,
      approved_by: approver.id,
      approved_at: new Date(),
      approval_note: trimmedNote,
      updatedBy: approver.id,
    },
  });
  await writeAuditLog({
    entityType: "opportunity",
    entityId: opportunityId,
    action: "updated",
    changes: [
      { field: "approval_status", old: "PENDING", new: decision },
      ...(trimmedNote
        ? [{ field: "approval_note", old: null, new: trimmedNote }]
        : []),
    ],
    userId: approver.id,
  });

  if (deal.assigned_to) {
    const rep = await prismadb.users.findUnique({ where: { id: deal.assigned_to } });
    if (rep?.email) {
      await notify(
        [rep.email],
        `Quote ${decision === "APPROVED" ? "approved" : "rejected"}: ${deal.name ?? opportunityId}`,
        `Your quote/SOW for "${deal.name ?? opportunityId}" was ${decision.toLowerCase()}.` +
          (trimmedNote ? `\nNote: ${trimmedNote}` : "") +
          `\nDeal: ${APP_URL()}/crm/opportunities/${opportunityId}`,
      );
    }
  }

  revalidatePath("/[locale]/(routes)/crm/opportunities", "page");
  return {};
}
