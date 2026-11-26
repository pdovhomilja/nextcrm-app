import { z } from "zod";

const text = z.string().nullish();

// The fields the contact forms send. Strict: a server action takes whatever the
// client posts, its TypeScript parameter type does not exist at runtime.
export const contactFieldsSchema = z.strictObject({
  assigned_to: z.string().optional(),
  assigned_account: text,
  birthday_day: text,
  birthday_month: text,
  birthday_year: text,
  description: text,
  email: text,
  personal_email: text,
  first_name: text,
  last_name: z.string(),
  office_phone: text,
  mobile_phone: text,
  website: text,
  position: text,
  status: z.boolean().optional(),
  social_twitter: text,
  social_facebook: text,
  social_linkedin: text,
  social_skype: text,
  social_instagram: text,
  social_youtube: text,
  social_tiktok: text,
  contact_type_id: z.string().optional(),
});
