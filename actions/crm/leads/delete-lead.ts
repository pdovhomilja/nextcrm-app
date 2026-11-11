"use server";
import * as svc from "@/lib/crm/leads/service";
import { runLeadAction } from "./run";

export const deleteLead = async (leadId: string) => {
  if (!leadId) return { error: "leadId is required" };

  return runLeadAction({ verb: "delete" }, async (user) => {
    await svc.deleteLead(user, leadId);
    return { success: true };
  });
};
