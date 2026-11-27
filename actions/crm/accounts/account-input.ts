import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { isManagerOrAdmin, type AuthzUser } from "@/lib/authz";

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

/**
 * An account's price list sets its prices: only an admin/manager picks it,
 * and only an active list. Returns the error to show, or null.
 */
export async function priceListChoiceError(user: AuthzUser, pricelistId: string): Promise<string | null> {
  if (!isManagerOrAdmin(user)) return "Forbidden";
  const list = await prismadb.crm_PriceLists.findUnique({ where: { id: pricelistId }, select: { isActive: true } });
  return list?.isActive ? null : "Price list not found";
}
