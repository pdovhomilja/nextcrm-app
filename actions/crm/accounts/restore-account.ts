"use server";
import * as svc from "@/lib/crm/accounts/service";
import { runAccountAction } from "./run";

export const restoreAccount = async (accountId: string) => {
  if (!accountId) return { error: "accountId is required" };

  // Restore never mapped plugin rule errors; kept that way.
  return runAccountAction(
    { verb: "restore", pluginRules: false, alsoRevalidate: "/[locale]/(routes)/admin/audit-log" },
    async (user) => {
      await svc.restoreAccount(user, accountId);
      return { success: true };
    },
  );
};
