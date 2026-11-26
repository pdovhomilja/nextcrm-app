"use server";
import * as svc from "@/lib/crm/accounts/service";
import { accountFieldsSchema } from "./account-input";
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
  // The fields the form sends, nothing else: the parameter type does not hold at runtime.
  const parsed = accountFieldsSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };
  const input = parsed.data;
  if (!input.name) return { error: "name is required" };

  return runAccountAction({ verb: "create", auth: { partner: true } }, async (user) => {
    // The form sends "" for an empty select; that means "not set".
    const account = await svc.createAccount(user, {
      ...input,
      assigned_to: input.assigned_to || undefined,
      industry: input.industry || undefined,
      pricelist_id: input.pricelist_id || undefined,
    });
    return { data: account };
  });
};
