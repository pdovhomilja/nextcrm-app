import type { RecordData } from "@nextcrm/plugin-sdk";
import type { M2O } from "./map";
import type { OdooClient } from "./odoo";
import type { Ctx } from "./settings";
import { K, type AccountLink } from "./store";

const fold = (v: unknown) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const val = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : false);

/** Spec § 4.2 step 2: street, city and postal code, trimmed, case and whitespace folded. */
export function sameAddress(a: { street?: unknown; city?: unknown; zip?: unknown }, b: { street?: unknown; city?: unknown; zip?: unknown }): boolean {
  return fold(a.street) === fold(b.street) && fold(a.city) === fold(b.city) && fold(a.zip).replace(/ /g, "") === fold(b.zip).replace(/ /g, "");
}

async function countryId(client: OdooClient, code: string): Promise<number | false> {
  const [c] = await client.call<{ id: number }[]>("res.country", "search_read", { domain: [["code", "=", code.toUpperCase()]], fields: ["id"], limit: 1 });
  return c?.id ?? false;
}

/** The Odoo user whose login or email is the order owner's email. */
export async function salesperson(ctx: Ctx, client: OdooClient, ownerId: string | null): Promise<number | false> {
  const owner = ownerId ? await ctx.data.users.get(ownerId) : null;
  const email = typeof owner?.email === "string" ? owner.email : null;
  if (!email) return false;
  const [u] = await client.call<{ id: number }[]>("res.users", "search_read", { domain: ["|", ["login", "=ilike", email], ["email", "=ilike", email]], fields: ["id"], limit: 1 });
  return u?.id ?? false;
}

async function link(ctx: Ctx, accountId: string, partnerId: number, list: M2O | undefined, now: Date) {
  await ctx.store.set(K.partner(partnerId), { accountId });
  await ctx.store.set(K.account(accountId), { partnerId, syncedAt: now.toISOString(), salesperson: null, odooPriceList: list || null } satisfies AccountLink);
}

/**
 * Spec § 4.2 step 1. Repeat-safe: a partner created by an earlier attempt is found again by registration number,
 * VAT, or (plan Ruling 3) exact name and country when the account has neither.
 */
export async function findOrCreateCustomer(ctx: Ctx, client: OdooClient, account: RecordData, user: number | false, now: Date): Promise<{ partnerId: number; created: boolean }> {
  const accountId = account.id as string;
  const linked = await ctx.store.get<AccountLink>(K.account(accountId));
  if (linked) return { partnerId: linked.partnerId, created: false };
  const country = await countryId(client, String(account.billing_country || ctx.settings.defaultCountry));
  const base = [["parent_id", "=", false], ["active", "=", true]];
  const tries: unknown[][] = [];
  if (val(account.company_id)) tries.push([...base, ["company_registry", "=", account.company_id], ["country_id", "=", country]]);
  if (val(account.vat)) tries.push([...base, ["vat", "=", account.vat]]);
  if (!val(account.company_id) && !val(account.vat)) tries.push([...base, ["name", "=", account.name], ["country_id", "=", country]]);
  for (const domain of tries) {
    const [p] = await client.call<{ id: number; property_product_pricelist?: M2O }[]>("res.partner", "search_read", { domain, fields: ["id", "property_product_pricelist"], limit: 1, order: "id asc" });
    if (p) { await link(ctx, accountId, p.id, p.property_product_pricelist, now); return { partnerId: p.id, created: false }; }
  }
  const [id] = await client.call<number[]>("res.partner", "create", { vals_list: [{
    name: account.name, is_company: true, company_registry: val(account.company_id), vat: val(account.vat),
    street: val(account.billing_street), city: val(account.billing_city), zip: val(account.billing_postal_code), country_id: country,
    email: val(account.email), phone: val(account.office_phone), customer_rank: 1, user_id: user,
  }] }, { once: true });
  const [p] = await client.call<{ id: number; property_product_pricelist?: M2O }[]>("res.partner", "read", { ids: [id], fields: ["property_product_pricelist"] });
  await link(ctx, accountId, id, p?.property_product_pricelist, now);
  return { partnerId: id, created: true };
}

/** Spec § 4.2 step 2: the customer or one of its delivery children with the same address, else a new delivery child. */
export async function findOrCreateDelivery(ctx: Ctx, client: OdooClient, partnerId: number, order: RecordData): Promise<{ shippingId: number; created: boolean }> {
  if (!val(order.shipping_street) && !val(order.shipping_city)) return { shippingId: partnerId, created: false };
  const want = { street: order.shipping_street, city: order.shipping_city, zip: order.shipping_postal_code };
  const rows = await client.call<{ id: number; street: string | false; city: string | false; zip: string | false }[]>("res.partner", "search_read", {
    domain: ["|", ["id", "=", partnerId], "&", ["parent_id", "=", partnerId], ["type", "=", "delivery"]], fields: ["id", "street", "city", "zip"], order: "id asc",
  });
  const hit = rows.find((r) => sameAddress(r, want));
  if (hit) return { shippingId: hit.id, created: false };
  const country = await countryId(client, String(order.shipping_country || ctx.settings.defaultCountry));
  const [id] = await client.call<number[]>("res.partner", "create", { vals_list: [{
    parent_id: partnerId, type: "delivery", street: val(order.shipping_street), city: val(order.shipping_city), zip: val(order.shipping_postal_code), country_id: country,
  }] }, { once: true });
  return { shippingId: id, created: true };
}
