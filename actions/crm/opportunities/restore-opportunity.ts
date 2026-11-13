"use server";
import * as svc from "@/lib/crm/opportunities/service";
import { runOpportunityAction } from "./run";

export const restoreOpportunity = async (opportunityId: string) => {
  if (!opportunityId) return { error: "opportunityId is required" };

  // Restore never mapped plugin rule errors; kept that way.
  return runOpportunityAction(
    { verb: "restore", pluginRules: false, alsoRevalidate: "/[locale]/(routes)/admin/audit-log" },
    async (user) => {
      await svc.restoreOpportunity(user, opportunityId);
      return { success: true };
    },
  );
};
