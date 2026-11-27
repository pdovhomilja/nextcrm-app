"use server";
import * as svc from "@/lib/crm/contacts/service";
import { runContactAction } from "./run";
import { contactFieldsSchema, toContactInput } from "./contact-input";

export const createContact = async (data: {
  assigned_to?: string;
  assigned_account?: string;
  birthday_day?: string;
  birthday_month?: string;
  birthday_year?: string;
  description?: string;
  email?: string;
  personal_email?: string;
  first_name?: string;
  last_name: string;
  office_phone?: string;
  mobile_phone?: string;
  website?: string;
  status?: boolean;
  social_twitter?: string;
  social_facebook?: string;
  social_linkedin?: string;
  social_skype?: string;
  social_instagram?: string;
  social_youtube?: string;
  social_tiktok?: string;
  contact_type_id?: string;
}) => {
  const parsed = contactFieldsSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };

  return runContactAction({ verb: "create", auth: { partner: true } }, async (user) => {
    const contact = await svc.createContact(user, { ...toContactInput(parsed.data), last_name: parsed.data.last_name });
    return { data: contact };
  });
};
