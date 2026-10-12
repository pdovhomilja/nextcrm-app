import type { RecordData } from "@nextcrm/plugin-sdk";
import type { M2O } from "./map";
import { normalizeNumber, normalizeVat } from "./match";
import { OdooError, type OdooClient } from "./odoo";
import type { Ctx } from "./settings";
import { K, type AccountLink, type PriceListLink } from "./store";

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

const CLAIM_MS = 30 * 60_000;

/** Review I3: one creator per account or customer at a time; a held claim means "wait", like Odoo being unreachable. */
async function exclusive<T>(ctx: Ctx, key: string, fn: () => Promise<T>): Promise<T> {
  if (!(await ctx.store.claim(key, CLAIM_MS))) throw new OdooError(`Another order is creating ${key} in Odoo`, 0);
  try { return await fn(); } finally { await ctx.store.delete(key); }
}

type Found = { id: number; property_product_pricelist?: M2O; company_registry?: string | false; vat?: string | false };

/**
 * Spec § 4.2 step 1. Repeat-safe: a partner created by an earlier attempt is found again by registration number,
 * VAT (both normalized like part 1's matching, review I2), or (plan Ruling 3) exact name and country when the account has neither.
 */
export async function findOrCreateCustomer(ctx: Ctx, client: OdooClient, account: RecordData, user: number | false, now: Date): Promise<{ partnerId: number; created: boolean }> {
  const accountId = account.id as string;
  const linked = await ctx.store.get<AccountLink>(K.account(accountId));
  if (linked) return { partnerId: linked.partnerId, created: false };
  return exclusive(ctx, `customer:${accountId}`, async () => {
    const code = String(account.billing_country || ctx.settings.defaultCountry).toUpperCase();
    const country = await countryId(client, code);
    const base = [["parent_id", "=", false], ["active", "=", true]];
    const number = normalizeNumber(code, val(account.company_id) || null);
    const vat = normalizeVat(val(account.vat) || null);
    const tries: { domain: unknown[]; keep: (p: Found) => boolean }[] = [];
    if (number) tries.push({ domain: [...base, ["company_registry", "ilike", number.replace(/^0+/, "")], ["country_id", "=", country]], keep: (p) => normalizeNumber(code, val(p.company_registry) || null) === number });
    if (vat) tries.push({ domain: [...base, ["vat", "ilike", vat.replace(/^[A-Z]{2}/, "")]], keep: (p) => normalizeVat(val(p.vat) || null) === vat });
    if (!number && !vat) tries.push({ domain: [...base, ["name", "=", account.name], ["country_id", "=", country]], keep: () => true });
    for (const t of tries) {
      const rows = await client.call<Found[]>("res.partner", "search_read", { domain: t.domain, fields: ["id", "property_product_pricelist", "company_registry", "vat"], order: "id asc" });
      const p = rows.find(t.keep);
      if (p) { await link(ctx, accountId, p.id, p.property_product_pricelist, now); return { partnerId: p.id, created: false }; }
    }
    // Live check: without this Odoo gives the new customer its default list, not the account's.
    const list = account.pricelist_id ? (await ctx.store.list("pricelist:")).find((e) => (e.value as PriceListLink).priceListId === account.pricelist_id) : undefined;
    const [id] = await client.call<number[]>("res.partner", "create", { vals_list: [{
      name: account.name, is_company: true, company_registry: val(account.company_id), vat: val(account.vat),
      street: val(account.billing_street), city: val(account.billing_city), zip: val(account.billing_postal_code), country_id: country,
      email: val(account.email), phone: val(account.office_phone), customer_rank: 1, user_id: user,
      ...(list ? { property_product_pricelist: Number(list.key.slice("pricelist:".length)) } : {}),
    }] }, { once: true });
    const [p] = await client.call<{ id: number; property_product_pricelist?: M2O }[]>("res.partner", "read", { ids: [id], fields: ["property_product_pricelist"] });
    await link(ctx, accountId, id, p?.property_product_pricelist, now);
    return { partnerId: id, created: true };
  });
}

/** Spec § 4.2 step 2: the customer or one of its delivery children with the same address, else a new delivery child. */
export async function findOrCreateDelivery(ctx: Ctx, client: OdooClient, partnerId: number, order: RecordData): Promise<{ shippingId: number; created: boolean }> {
  if (!val(order.shipping_street) && !val(order.shipping_city)) return { shippingId: partnerId, created: false };
  return exclusive(ctx, `delivery:${partnerId}`, () => deliveryFor(ctx, client, partnerId, order));
}

async function deliveryFor(ctx: Ctx, client: OdooClient, partnerId: number, order: RecordData): Promise<{ shippingId: number; created: boolean }> {
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
