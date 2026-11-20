"use server";
import * as svc from "@/lib/crm/accounts/service";
import { runAccountAction } from "./run";

export const updateAccount = async (data: {
  id: string;
  name?: string;
  office_phone?: string | null;
  website?: string | null;
  fax?: string | null;
  company_id?: string;
  vat?: string | null;
  email?: string;
  billing_street?: string;
  billing_postal_code?: string;
  billing_city?: string;
  billing_state?: string | null;
  billing_country?: string;
  shipping_street?: string | null;
  shipping_postal_code?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_country?: string | null;
  description?: string | null;
  assigned_to?: string;
  status?: string | null;
  annual_revenue?: string | null;
  member_of?: string | null;
  industry?: string;
  pricelist_id?: string | null;
}) => {
  const { id, ...rest } = data;
  if (!id) return { error: "id is required" };

  return runAccountAction({ verb: "update", auth: { partner: true } }, async (user) => {
    const account = await svc.updateAccount(user, id, {
      ...rest,
      // An empty price list select clears it.
      ...(rest.pricelist_id === "" && { pricelist_id: null }),
    });
    return { data: account };
  });
};
