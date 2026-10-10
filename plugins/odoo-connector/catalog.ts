import { categoryOrder, mapRules, baseRefs, orderLists, variantFields, RULE_FIELDS, VARIANT_FIELDS, type OdooCategory, type OdooRule, type OdooVariant } from "./catalog-map";
import type { ExternalProductInput } from "@nextcrm/plugin-sdk";
import type { OdooClient } from "./odoo";
import { chosenLists, type Ctx } from "./settings";
import { K, type AccountLink, type CatalogCounts, type PriceListLink, type ProductLink } from "./store";

const OVERLAP_MS = 2 * 60_000;
const PAGE = 200;
const MAX_CHAIN = 11;   // core loads at most 11 lists per price (lib/pricing/get-price.ts MAX_LISTS)
const odooTime = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
const fromOdoo = (s: string) => new Date(`${s.replace(" ", "T")}Z`);
type ListRow = { id: number; name: string; currency_id: [number, string] | false; active: boolean; write_date: string };
type Item = OdooRule & { pricelist_id: [number, string] | false; write_date: string };

export async function syncCatalog({ ctx, client, dry, now }: { ctx: Ctx; client: OdooClient; dry: boolean; now: Date }): Promise<CatalogCounts> {
  const counts: CatalogCounts = { categories: 0, productsCreated: 0, productsUpdated: 0, productsFailed: 0, listsReplaced: 0, listsMissing: [], accountLists: 0 };
  const cursor = (await ctx.store.get<{ at: string }>(K.catalogCursor))?.at ?? null;
  const since = cursor ? odooTime(new Date(fromOdoo(cursor).getTime() - OVERLAP_MS)) : null;
  let top = cursor;
  const seen = (w: string) => { if (!top || w > top) top = w; };

  // 1. Categories: all, parents first.
  const cats = categoryOrder(await client.call<OdooCategory[]>("product.category", "search_read", { domain: [], fields: ["id", "name", "parent_id"] }));
  for (const c of cats) {
    counts.categories++;
    if (dry) continue;
    const parentRef = c.parent_id ? String(c.parent_id[0]) : null;
    const { id: categoryId } = await ctx.data.productCategories.upsertExternal(String(c.id), { name: c.name, parentRef });
    await ctx.store.set(K.category(c.id), { categoryId, parentRef });
  }

  // 2. Products: changed variants (own or template write_date), plus those marked for retry.
  const fields = await availableFields(client, "product.product", VARIANT_FIELDS);
  const retry = (await ctx.store.list("retryProduct:")).map((e) => Number(e.key.slice(13)));
  const domain = since
    ? ["|", "|", ["write_date", ">", since], ["product_tmpl_id.write_date", ">", since], ["id", "in", retry]]
    : [["sale_ok", "in", [true, false]]];
  const taxes = new Map<number, string | null>();
  const taxRate = (ids: number[]) => (ids.length === 1 ? taxes.get(ids[0]) ?? null : null);
  for (let offset = 0; ; offset += PAGE) {
    const rows = await client.call<OdooVariant[]>("product.product", "search_read", { domain, fields, limit: PAGE, offset, order: "id asc", context: { active_test: false } });
    const missing = Array.from(new Set(rows.flatMap((v) => v.taxes_id))).filter((id) => !taxes.has(id));
    if (missing.length) {
      for (const t of await client.call<{ id: number; amount: number; amount_type: string }[]>("account.tax", "read", { ids: missing, fields: ["amount", "amount_type"] })) {
        taxes.set(t.id, t.amount_type === "percent" ? String(t.amount) : null);
      }
    }
    for (const v of rows) {
      seen(v.write_date);
      const known = await ctx.store.get<ProductLink>(K.product(v.id));
      // Never-sellable variants that were never imported are not catalog products.
      if (!known && !(v.sale_ok && v.active)) continue;
      const f = variantFields(v, taxRate);
      // The 2-minute overlap re-reads recent variants; an unchanged one is not written (and does not trigger list replaces).
      if (known && !(await ctx.store.get(K.retryProduct(v.id))) && sameProduct(await ctx.data.products.get(known.productId), f, known)) continue;
      if (dry) { counts[known ? "productsUpdated" : "productsCreated"]++; ctx.log.info(`Dry run: would ${known ? "update" : "create"} product`, { odooId: v.id, ...f }); continue; }
      try {
        const res = await ctx.data.products.upsertExternal(String(v.id), f);
        counts[res.created ? "productsCreated" : "productsUpdated"]++;
        await ctx.store.set(K.product(v.id), { productId: res.id, tmplId: v.product_tmpl_id ? v.product_tmpl_id[0] : null, categoryRef: f.categoryRef } satisfies ProductLink);
        await ctx.store.delete(K.retryProduct(v.id));
      } catch (e) {
        counts.productsFailed++;
        ctx.log.error(`Product ${v.id} failed: ${e instanceof Error ? e.message : String(e)}`, { odooId: v.id });
        await ctx.store.set(K.retryProduct(v.id), {});
      }
    }
    if (rows.length < PAGE) break;
  }

  const productsChanged = counts.productsCreated + counts.productsUpdated > 0;

  // 3. Price lists: chosen + bases (recursively, archived included), bases first.
  const chosen = chosenLists(ctx);
  const lists = new Map<number, ListRow>();
  const items = new Map<number, Item[]>();
  // Lists imported earlier stay in the run so a list removed from the setting is deactivated (review I2).
  const stored = (await ctx.store.list("pricelist:")).map((e) => Number(e.key.slice(10)));
  let frontier = Array.from(new Set([...chosen, ...stored]));
  while (frontier.length) {
    const rows = await client.call<ListRow[]>("product.pricelist", "search_read", { domain: [["id", "in", frontier]], fields: ["id", "name", "currency_id", "active", "write_date"], context: { active_test: false } });
    for (const id of frontier) if (!rows.some((l) => l.id === id) && chosen.includes(id)) {
      counts.listsMissing.push(id);
      ctx.log.warn(`Odoo price list ${id} not found`);
    }
    const ruleFields = await availableFields(client, "product.pricelist.item", RULE_FIELDS);
    const its = rows.length ? await client.call<Item[]>("product.pricelist.item", "search_read", { domain: [["pricelist_id", "in", rows.map((l) => l.id)]], fields: [...ruleFields, "pricelist_id"], context: { active_test: false } }) : [];
    for (const l of rows) { lists.set(l.id, l); items.set(l.id, its.filter((i) => i.pricelist_id && i.pricelist_id[0] === l.id)); }
    frontier = Array.from(new Set(rows.flatMap((l) => baseRefs(items.get(l.id)!)))).filter((id) => !lists.has(id));
  }
  const { order, cyclic, tooDeep } = orderLists(new Map(Array.from(lists.keys()).map((id) => [id, baseRefs(items.get(id)!).filter((b) => lists.has(b))])), MAX_CHAIN);
  for (const id of cyclic) ctx.log.warn(`Price list ${id} skipped: its base lists form a cycle`);
  for (const id of tooDeep) ctx.log.warn(`Price list ${id} skipped: it builds on more than ${MAX_CHAIN - 1} other lists`);
  const known = new Set((await ctx.data.products.findExternal()).map((p) => p.ref));
  const tmplVariants = new Map<number, number[]>();
  for (const e of await ctx.store.list("product:")) {
    const { tmplId } = e.value as ProductLink;
    if (tmplId) tmplVariants.set(tmplId, [...(tmplVariants.get(tmplId) ?? []), Number(e.key.slice(8))]);
  }
  const listIds = new Map<number, string>();
  let firstImport = false;
  for (const id of order) {
    const l = lists.get(id)!;
    const its = items.get(id)!;
    const prev = await ctx.store.get<PriceListLink>(K.pricelist(id));
    // Replace when new, when the list or a rule changed in Odoo, when a rule was deleted (count), or when products
    // changed this run (a template rule may now expand to a different set of variants).
    const isActive = chosen.includes(id) && l.active;
    const changed = !prev || !cursor || l.write_date > cursor || its.some((i) => i.write_date > cursor) || prev.ruleCount !== its.length || productsChanged || prev.isActive !== isActive;
    const missingBase = baseRefs(its).find((b) => !lists.has(b) || (!listIds.has(b) && !dry));
    if (missingBase !== undefined) { ctx.log.warn(`Price list ${id} skipped: base list ${missingBase} is not available`); continue; }
    its.forEach((i) => seen(i.write_date)); seen(l.write_date);
    const { rules, skipped } = mapRules(its, (t) => tmplVariants.get(t) ?? [], known);
    if (!dry) await ctx.store.set(K.skipped(id), skipped);
    if (prev && !changed) { listIds.set(id, prev.priceListId); continue; }
    if (!prev) firstImport = true;
    counts.listsReplaced++;
    if (dry) { ctx.log.info("Dry run: would replace price list", { odooId: id, name: l.name, rules: rules.length, skipped: skipped.length }); continue; }
    const { id: priceListId } = await ctx.data.priceLists.replaceExternal(String(id), { name: l.name, currency: l.currency_id ? l.currency_id[1] : "", isActive }, rules);
    listIds.set(id, priceListId);
    await ctx.store.set(K.pricelist(id), { priceListId, name: l.name, ruleCount: its.length, syncedAt: now.toISOString(), isActive } satisfies PriceListLink);
  }

  // 4. Account price lists follow the Odoo customer (Pavel 2026-10-10). Customers are re-read when a link has no
  // list yet (linked before the catalog existed) or a list was imported for the first time (spec § 4.4, review I1).
  const accounts = (await ctx.store.list("account:")).map((e) => ({ key: e.key, link: e.value as AccountLink }));
  const stale = accounts.filter((a) => firstImport || a.link.odooPriceList === undefined);
  for (let i = 0; i < stale.length; i += PAGE) {
    const chunk = stale.slice(i, i + PAGE);
    const rows = await client.call<{ id: number; property_product_pricelist: [number, string] | false }[]>("res.partner", "read", { ids: chunk.map((a) => a.link.partnerId), fields: ["property_product_pricelist"] });
    for (const a of chunk) {
      a.link = { ...a.link, odooPriceList: rows.find((r) => r.id === a.link.partnerId)?.property_product_pricelist || null };
      if (!dry) await ctx.store.set(a.key, a.link);
    }
  }
  for (const { key, link } of accounts) {
    const odooList = link.odooPriceList ? link.odooPriceList[0] : null;
    // Only chosen lists are assigned; a helper base list or a list removed from the setting is not (review I2).
    const priceListId = odooList && chosen.includes(odooList) ? listIds.get(odooList) : undefined;
    if (!priceListId) continue;
    const accountId = key.slice(8);
    const acc = await ctx.data.accounts.get(accountId);
    if (!acc || acc.pricelist_id === priceListId) continue;
    counts.accountLists++;
    if (!dry) await ctx.data.accounts.update(accountId, { pricelist_id: priceListId });
  }

  if (!dry && top) await ctx.store.set(K.catalogCursor, { at: top });
  return counts;
}

/** True when the stored product already has these values (decimals compared as numbers). */
function sameProduct(row: Record<string, unknown> | null, f: ExternalProductInput, link: ProductLink): boolean {
  if (!row) return false;
  const num = (a: unknown, b: string | null) => (a == null || b == null ? a == b : Number(a) === Number(b));
  return row.name === f.name && (row.sku ?? null) === f.sku && (row.description ?? null) === f.description && row.type === f.type
    && row.status === f.status && num(row.unit_price, f.unit_price) && num(row.unit_cost, f.unit_cost) && row.currency === f.currency
    && num(row.tax_rate, f.tax_rate) && (row.unit ?? null) === f.unit && link.categoryRef === f.categoryRef;
}

async function availableFields(client: OdooClient, model: string, wanted: string[]) {
  const available = await client.call<Record<string, unknown>>(model, "fields_get", { attributes: ["type"] });
  return wanted.filter((f) => f in available);
}
