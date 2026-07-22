"use server";
import { prismadb } from "@/lib/prisma";
import { junctionTableHelpers } from "@/lib/junction-helpers";
import {
  requireAuthenticated,
  assertCanWriteAccount,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const watchAccount = async (accountId: string) => {
  if (!accountId) return { error: "accountId is required" };

  // `watchers` is inside accountUserScopeOR, so becoming a watcher grants
  // read+write scope — an unguarded watch would be a self-service escalation
  // primitive. Watching therefore requires write access.
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
      data: {
        watchers: junctionTableHelpers.addWatcher(user.id),
      },
    });
    return { success: true };
  } catch (error) {
    console.log("[WATCH_ACCOUNT]", error);
    return { error: "Failed to watch account" };
  }
};
