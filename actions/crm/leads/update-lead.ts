"use server";
import * as svc from "@/lib/crm/leads/service";
import { runLeadAction } from "./run";

export const updateLead = async (data: {
  id: string;
  firstName?: string | null;
  lastName: string;
  company?: string | null;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  description?: string | null;
  lead_source_id?: string | null;
  lead_status_id?: string | null;
  lead_type_id?: string | null;
  refered_by?: string | null;
  campaign?: string | null;
  assigned_to?: string;
  accountIDs?: string;
}) => {
  const {
    id,
    firstName,
    lastName,
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

  if (!id) return { error: "id is required" };

  return runLeadAction({ verb: "update", auth: { partner: true } }, async (user) => {
    // The form always sends every field. An empty select keeps the stored
    // status/source/type, and an empty assignee means the caller.
    const lead = await svc.updateLead(user, id, {
      firstName,
      lastName,
      company,
      jobTitle,
      email,
      phone,
      description,
      lead_source_id: lead_source_id || undefined,
      lead_status_id: lead_status_id || undefined,
      lead_type_id: lead_type_id || undefined,
      refered_by,
      campaign,
      assigned_to: assigned_to || user.id,
      accountsIDs: accountIDs,
    });
    return { data: lead };
  });
};
