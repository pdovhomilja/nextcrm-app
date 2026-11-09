"use server";
import { revalidatePath } from "next/cache";
import { pluginRuleErrorMessage } from "@/lib/plugins/action-errors";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import * as svc from "@/lib/crm/leads/service";
import { LeadError } from "@/lib/crm/leads/types";

export const deleteLead = async (leadId: string) => {
  if (!leadId) return { error: "leadId is required" };

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  try {
    await svc.deleteLead(user, leadId);
    revalidatePath("/[locale]/(routes)/crm/leads", "page");
    return { success: true };
  } catch (error) {
    if (error instanceof LeadError && error.code === "forbidden") return { error: "Forbidden" };
    const ruleMessage = await pluginRuleErrorMessage(error);
    if (ruleMessage) return { error: ruleMessage };
    console.log("[DELETE_LEAD]", error);
    return { error: "Failed to delete lead" };
  }
};
