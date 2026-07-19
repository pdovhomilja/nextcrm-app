"use server";

import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit-log";
import {
  requireAuthenticated,
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

// Spec §3.8: clients with strong measurable results are flagged as
// case-study candidates; the CSO approves.
export async function setCaseStudyCandidate(
  accountId: string,
  candidate: boolean,
): Promise<{ error?: string }> {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  const account = await prismadb.crm_Accounts.findFirst({
    where: { id: accountId, deletedAt: null },
  });
  if (!account) return { error: "Account not found" };

  await prismadb.crm_Accounts.update({
    where: { id: accountId },
    data: {
      case_study_candidate: candidate,
      // Withdrawing the candidacy withdraws any prior approval.
      ...(candidate ? {} : { case_study_approved: false }),
      updatedBy: user.id,
    },
  });
  await writeAuditLog({
    entityType: "account",
    entityId: accountId,
    action: "updated",
    changes: [
      {
        field: "case_study_candidate",
        old: account.case_study_candidate,
        new: candidate,
      },
    ],
    userId: user.id,
  });
  revalidatePath("/[locale]/(routes)/crm/accounts", "page");
  return {};
}

export async function setCaseStudyApproved(
  accountId: string,
  approved: boolean,
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

  const account = await prismadb.crm_Accounts.findFirst({
    where: { id: accountId, deletedAt: null },
  });
  if (!account) return { error: "Account not found" };
  if (approved && !account.case_study_candidate)
    return { error: "Flag the account as a case-study candidate first." };

  await prismadb.crm_Accounts.update({
    where: { id: accountId },
    data: { case_study_approved: approved, updatedBy: approver.id },
  });
  await writeAuditLog({
    entityType: "account",
    entityId: accountId,
    action: "updated",
    changes: [
      {
        field: "case_study_approved",
        old: account.case_study_approved,
        new: approved,
      },
    ],
    userId: approver.id,
  });
  revalidatePath("/[locale]/(routes)/crm/accounts", "page");
  return {};
}
