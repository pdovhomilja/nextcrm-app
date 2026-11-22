import { z } from "zod";

const text = z.string().nullish();

// The fields the account forms send. Strict: a server action takes whatever the
// client posts, its TypeScript parameter type does not exist at runtime.
export const accountFieldsSchema = z.strictObject({
  name: z.string(),
  office_phone: text,
  website: text,
  fax: text,
  company_id: text,
  vat: text,
  email: text,
  billing_street: text,
  billing_postal_code: text,
  billing_city: text,
  billing_state: text,
  billing_country: text,
  shipping_street: text,
  shipping_postal_code: text,
  shipping_city: text,
  shipping_state: text,
  shipping_country: text,
  description: text,
  assigned_to: z.string().optional(),
  status: text,
  annual_revenue: text,
  member_of: text,
  industry: z.string().optional(),
  pricelist_id: text,
});
