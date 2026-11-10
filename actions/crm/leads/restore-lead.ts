"use server";
import { revalidatePath } from "next/cache";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import * as svc from "@/lib/crm/leads/service";
import { LeadError, leadErrorMessage } from "@/lib/crm/leads/types";

export const restoreLead = async (leadId: string) => {
  if (!leadId) return { error: "leadId is required" };

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  try {
    await svc.restoreLead(user, leadId);
    revalidatePath("/[locale]/(routes)/crm/leads", "page");
    revalidatePath("/[locale]/(routes)/admin/audit-log", "page");
    return { success: true };
  } catch (error) {
    if (error instanceof LeadError) return { error: leadErrorMessage(error) };
    console.log("[RESTORE_LEAD]", error);
    return { error: "Failed to restore lead" };
  }
};
