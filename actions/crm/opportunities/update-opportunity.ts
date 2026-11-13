"use server";
import * as svc from "@/lib/crm/opportunities/service";
import { serializeDecimals } from "@/lib/serialize-decimals";
import { runOpportunityAction } from "./run";

export const updateOpportunity = async (data: {
  id: string;
  account?: string;
  assigned_to?: string;
  budget?: string;
  campaign?: string | null;
  close_date?: Date;
  delivery_deadline?: Date;
  contact?: string;
  currency?: string;
  description?: string;
  expected_revenue?: string;
  name?: string;
  next_step?: string;
  sales_stage?: string;
  type?: string;
}) => {
  const {
    id,
    account,
    assigned_to,
    budget,
    campaign,
    close_date,
    delivery_deadline,
    contact,
    currency,
    description,
    expected_revenue,
    name,
    next_step,
    sales_stage,
    type,
  } = data;

  if (!id) return { error: "id is required" };

  return runOpportunityAction({ verb: "update", auth: { partner: true } }, async (user) => {
    // The form sends every field on every save. "" for a select or a number keeps the stored value.
    const opportunity = await svc.updateOpportunity(user, id, {
      account: account || undefined,
      assigned_to: assigned_to || undefined,
      budget: budget ? parseFloat(budget) : undefined,
      // Not sent = unchanged; "" (empty select) or null clears the link.
      campaign: campaign === undefined ? undefined : campaign || null,
      close_date,
      delivery_deadline,
      contact: contact || undefined,
      currency: currency || undefined,
      description,
      expected_revenue: expected_revenue ? parseFloat(expected_revenue) : undefined,
      name,
      next_step,
      sales_stage: sales_stage || undefined,
      type: type || undefined,
      // The form reactivates the deal on every save, as it always has.
      status: "ACTIVE",
    });
    // crm_Opportunities has Decimal columns and no BigInt ones.
    return { data: serializeDecimals(opportunity) };
  });
};
