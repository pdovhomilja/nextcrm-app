"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { pluginRuleErrorMessage } from "@/lib/plugins/action-errors";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import {
  requireAuthenticated,
  assertCanWriteAccount,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const deleteAccount = async (accountId: string) => {
  if (!accountId) return { error: "accountId is required" };

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    await assertCanWriteAccount(user, accountId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    await prismadb.crm_Accounts.update({
      where: { id: accountId },
      data: { deletedAt: new Date(), deletedBy: user.id },
    });
    await writeAuditLog({
      entityType: "account",
      entityId: accountId,
      action: "deleted",
      changes: null,
      userId: user.id,
    });
    revalidatePath("/[locale]/(routes)/crm/accounts", "page");
    void inngest.send({ name: "crm/account.deleted", data: { record_id: accountId } });
    return { success: true };
  } catch (error) {
    const ruleMessage = await pluginRuleErrorMessage(error);
    if (ruleMessage) return { error: ruleMessage };
    console.log("[DELETE_ACCOUNT]", error);
    return { error: "Failed to delete account" };
  }
};
