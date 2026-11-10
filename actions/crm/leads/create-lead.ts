"use server";
import * as svc from "@/lib/crm/leads/service";
import { runLeadAction } from "./run";

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

  return runLeadAction({ verb: "create", auth: { partner: true } }, async (user) => {
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
    return { data: lead };
  });
};
