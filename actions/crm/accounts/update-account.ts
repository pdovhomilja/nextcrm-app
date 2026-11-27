"use server";
import * as svc from "@/lib/crm/accounts/service";
import { accountFieldsSchema } from "./account-input";
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
  const { id, ...fields } = data ?? {};
  if (!id) return { error: "id is required" };
  // The fields the form sends, nothing else: the parameter type does not hold at runtime.
  const parsed = accountFieldsSchema.partial().safeParse(fields);
  if (!parsed.success) return { error: "Invalid input" };
  const rest = parsed.data;

  return runAccountAction({ verb: "update", auth: { partner: true } }, async (user) => {
    const account = await svc.updateAccount(user, id, {
      ...rest,
      // An empty price list or industry select clears it; an empty assignee keeps the current one.
      ...(rest.pricelist_id === "" && { pricelist_id: null }),
      ...(rest.industry === "" && { industry: null }),
      ...(rest.assigned_to === "" && { assigned_to: undefined }),
    });
    return { data: account };
  });
};
