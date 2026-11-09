"use server";
import { revalidatePath } from "next/cache";
import { pluginRuleErrorMessage } from "@/lib/plugins/action-errors";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import * as svc from "@/lib/crm/leads/service";
import { LeadError, leadErrorMessage } from "@/lib/crm/leads/types";

export const createLead = async (data: {
  first_name?: string;
  last_name: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  description?: string;
  lead_source_id?: string;
  lead_status_id?: string;
  lead_type_id?: string;
  refered_by?: string;
  campaign?: string;
  assigned_to?: string;
  accountIDs?: string;
}) => {
  const {
    first_name,
    last_name,
    company,
    jobTitle,
    email,
    phone,
    description,
    lead_source_id,
    lead_status_id,
    lead_type_id,
    refered_by,
    campaign,
    assigned_to,
    accountIDs,
  } = data;

  let user;
  try {
    user = await requireAuthenticated({ partner: true });
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  try {
    // The form sends "" for an empty select; that means "not set".
    const lead = await svc.createLead(user, {
      firstName: first_name,
      lastName: last_name,
      company,
      jobTitle,
      email,
      phone,
      description,
      lead_source_id: lead_source_id || undefined,
      lead_status_id: lead_status_id || undefined,
      lead_type_id: lead_type_id || undefined,
      refered_by: refered_by || undefined,
      campaign: campaign || undefined,
      assigned_to: assigned_to || undefined,
      accountsIDs: accountIDs || undefined,
    });
    revalidatePath("/[locale]/(routes)/crm/leads", "page");
    return { data: lead };
  } catch (error) {
    if (error instanceof LeadError) return { error: leadErrorMessage(error) };
    const ruleMessage = await pluginRuleErrorMessage(error);
    if (ruleMessage) return { error: ruleMessage };
    console.log("[CREATE_LEAD]", error);
    return { error: "Failed to create lead" };
  }
};
