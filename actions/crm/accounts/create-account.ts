"use server";
import * as svc from "@/lib/crm/accounts/service";
import { runAccountAction } from "./run";

export const createAccount = async (data: {
  name: string;
  office_phone?: string;
  website?: string;
  fax?: string;
  company_id?: string;
  vat?: string;
  email?: string;
  billing_street?: string;
  billing_postal_code?: string;
  billing_city?: string;
  billing_state?: string;
  billing_country?: string;
  shipping_street?: string;
  shipping_postal_code?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_country?: string;
  description?: string;
  assigned_to?: string;
  status?: string;
  annual_revenue?: string;
  member_of?: string;
  industry?: string;
  pricelist_id?: string | null;
}) => {
  if (!data.name) return { error: "name is required" };

  return runAccountAction({ verb: "create", auth: { partner: true } }, async (user) => {
    // The form sends "" for an empty select; that means "not set".
    const account = await svc.createAccount(user, {
      ...data,
      assigned_to: data.assigned_to || undefined,
      industry: data.industry || undefined,
      pricelist_id: data.pricelist_id || undefined,
    });
    return { data: account };
  });
};
