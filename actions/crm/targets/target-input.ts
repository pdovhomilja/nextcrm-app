import { z } from "zod";

// The fields the target forms send. Strict: a server action takes whatever the
// client posts, its TypeScript parameter type does not exist at runtime.
export const targetFieldsSchema = z.strictObject({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().optional(),
  mobile_phone: z.string().optional(),
  office_phone: z.string().optional(),
  company: z.string().optional(),
  company_website: z.string().optional(),
  personal_website: z.string().optional(),
  position: z.string().optional(),
  social_x: z.string().optional(),
  social_linkedin: z.string().optional(),
  social_instagram: z.string().optional(),
  social_facebook: z.string().optional(),
  personal_email: z.string().optional(),
  company_email: z.string().optional(),
  company_phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  industry: z.string().optional(),
  employees: z.string().optional(),
  description: z.string().optional(),
  status: z.boolean().optional(),
});
