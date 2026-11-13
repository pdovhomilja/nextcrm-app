"use server";
import * as svc from "@/lib/crm/opportunities/service";
import { runOpportunityAction } from "./run";

export const deleteOpportunity = async (opportunityId: string) => {
  if (!opportunityId) return { error: "opportunityId is required" };

  return runOpportunityAction({ verb: "delete" }, async (user) => {
    await svc.deleteOpportunity(user, opportunityId);
    return { success: true };
  });
};
