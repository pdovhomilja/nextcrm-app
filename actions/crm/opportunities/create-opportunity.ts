"use server";
import * as svc from "@/lib/crm/opportunities/service";
import { runOpportunityAction } from "./run";

export const createOpportunity = async (data: {
  account?: string;
  assigned_to?: string;
  budget?: string;
  campaign?: string;
  close_date?: Date;
  delivery_deadline?: Date;
  contact?: string;
  currency?: string;
  description?: string;
  expected_revenue?: string;
  name: string;
  next_step?: string;
  sales_stage?: string;
  type?: string;
}) => {
  const {
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

  return runOpportunityAction({ verb: "create", auth: { partner: true } }, async (user) => {
    // The form sends "" for an empty field; that means "not set".
    const opportunity = await svc.createOpportunity(user, {
      account: account || undefined,
      assigned_to: assigned_to || undefined,
      budget: budget ? parseFloat(budget) : undefined,
      campaign: campaign || undefined,
      close_date,
      delivery_deadline,
      contact: contact || undefined,
      currency: currency || undefined,
      description: description || undefined,
      expected_revenue: expected_revenue ? parseFloat(expected_revenue) : undefined,
      name,
      next_step: next_step || undefined,
      sales_stage: sales_stage || undefined,
      type: type || undefined,
    });
    return { data: opportunity };
  });
};
