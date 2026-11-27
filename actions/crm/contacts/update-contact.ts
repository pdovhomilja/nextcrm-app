"use server";
import * as svc from "@/lib/crm/contacts/service";
import { runContactAction } from "./run";
import { contactFieldsSchema, toContactInput } from "./contact-input";

export const updateContact = async (data: {
  id: string;
  assigned_to?: string;
  assigned_account?: string | null;
  birthday_day?: string | null;
  birthday_month?: string | null;
  birthday_year?: string | null;
  description?: string | null;
  email?: string;
  personal_email?: string | null;
  first_name?: string | null;
  last_name?: string;
  office_phone?: string | null;
  mobile_phone?: string | null;
  website?: string | null;
  status?: boolean;
  social_twitter?: string | null;
  social_facebook?: string | null;
  social_linkedin?: string | null;
  social_skype?: string | null;
  social_instagram?: string | null;
  social_youtube?: string | null;
  social_tiktok?: string | null;
  contact_type_id?: string;
}) => {
  const { id, ...fields } = data ?? {};
  if (!id) return { error: "id is required" };
  const parsed = contactFieldsSchema.partial().safeParse(fields);
  if (!parsed.success) return { error: "Invalid input" };

  return runContactAction({ verb: "update", auth: { partner: true } }, async (user) => {
    const contact = await svc.updateContact(user, id, toContactInput(parsed.data));
    return { data: contact };
  });
};
