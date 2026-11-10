"use server";
import * as svc from "@/lib/crm/leads/service";
import { runLeadAction } from "./run";

export const restoreLead = async (leadId: string) => {
  if (!leadId) return { error: "leadId is required" };

  // Restore never mapped plugin rule errors; kept that way.
  return runLeadAction(
    { verb: "restore", pluginRules: false, alsoRevalidate: "/[locale]/(routes)/admin/audit-log" },
    async (user) => {
      await svc.restoreLead(user, leadId);
      return { success: true };
    },
  );
};
