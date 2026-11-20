"use server";
import * as svc from "@/lib/crm/accounts/service";
import { runAccountAction } from "./run";

export const deleteAccount = async (accountId: string) => {
  if (!accountId) return { error: "accountId is required" };

  return runAccountAction({ verb: "delete" }, async (user) => {
    await svc.deleteAccount(user, accountId);
    return { success: true };
  });
};
