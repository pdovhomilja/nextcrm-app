import type { ExternalRuleInput } from "@nextcrm/plugin-sdk";
import { mapRules, RULE_FIELDS, type OdooRule } from "./catalog-map";
import { OdooError, type OdooClient } from "./odoo";
import { chosenLists, type Ctx } from "./settings";
import { K, type CompareResult, type PriceListLink, type ProductLink } from "./store";

const PARALLEL = 4;
const LOCK_MS = 10 * 60_000;

export function pickSample(rules: ExternalRuleInput[], products: { ref: string; categoryRef: string | null }[], parents: Map<string, string | null>, n = 20) {
  const sorted = [...products].sort((a, b) => Number(a.ref) - Number(b.ref));
  const chain = (c: string | null) => { const out: string[] = []; while (c && !out.includes(c)) { out.push(c); c = parents.get(c) ?? null; } return out; };
  const qty = (min: string) => { const m = Number(min); return m > 1 ? [1, m, m - 1] : [1]; };
  const out: { ref: string; quantities: number[] }[] = [];
  const take = (ref: string, quantities: number[]) => { if (out.length < n && !out.some((o) => o.ref === ref)) out.push({ ref, quantities }); };
  for (const r of rules.filter((r) => r.appliesTo === "PRODUCT")) take(r.productRef!, qty(r.minQuantity));
  for (const r of rules.filter((r) => r.appliesTo === "CATEGORY")) {
    const p = sorted.find((x) => !out.some((o) => o.ref === x.ref) && chain(x.categoryRef).includes(r.categoryRef!));
    if (p) take(p.ref, qty(r.minQuantity));
  }
  if (rules.some((r) => r.base === "PRICE_LIST")) { const p = sorted.find((x) => !out.some((o) => o.ref === x.ref)); if (p) take(p.ref, [1]); }
  for (const p of sorted) take(p.ref, [1]);
  return out;
}

export async function odooPrice(client: OdooClient, q: { pricelistId: number; currencyId: number; productId: number; quantity: number }): Promise<number> {
  const res = await client.call<{ value?: { price_unit?: number } }>("sale.order.line", "onchange", {
    values: { order_id: { id: false, pricelist_id: q.pricelistId, currency_id: q.currencyId }, product_id: q.productId, product_uom_qty: q.quantity },
    field_names: ["product_id"],
    fields_spec: { order_id: { fields: { pricelist_id: {} } }, product_id: {}, product_uom_qty: {}, price_unit: {} },
  });
  const price = res?.value?.price_unit;
  if (typeof price !== "number") throw new OdooError("Odoo cannot price sale lines over the API", 0);
  return price;
}

async function pool<T>(items: T[], fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(PARALLEL, items.length) }, async () => { while (i < items.length) await fn(items[i++]); }));
}

export async function runCompare(ctx: Ctx, client: OdooClient, now: Date): Promise<void> {
  const result: CompareResult = { at: now.toISOString(), ok: true, lists: [], mismatches: [] };
  await ctx.store.set(K.lock, { until: new Date(now.getTime() + LOCK_MS).toISOString() });
  try {
    const products = (await ctx.data.products.findExternal()).filter((p) => p.status === "ACTIVE");
    const rows = await Promise.all(products.map(async (p) => ({ ...p, row: await ctx.data.products.get(p.id) })));
    const links = new Map((await ctx.store.list("product:")).map((e) => [e.key.slice(8), e.value as ProductLink]));
    const parents = new Map((await ctx.store.list("category:")).map((e) => [e.key.slice(9), (e.value as { parentRef: string | null }).parentRef]));
    const sampleable = rows.map((p) => ({ ref: p.ref, categoryRef: links.get(p.ref)?.categoryRef ?? null, id: p.id, name: String(p.row?.name ?? p.ref), currency: String(p.row?.currency ?? "") }));
    const chosen = chosenLists(ctx);
    const ruleFields = (f: Record<string, unknown>) => RULE_FIELDS.filter((x) => x in f);
    const fields = ruleFields(await client.call<Record<string, unknown>>("product.pricelist.item", "fields_get", { attributes: ["type"] }));
    const total = chosen.length;
    let done = 0;
    for (const odooId of chosen) {
      const link = await ctx.store.get<PriceListLink>(K.pricelist(odooId));
      if (!link) continue;
      const [list] = await client.call<{ currency_id: [number, string] }[]>("product.pricelist", "read", { ids: [odooId], fields: ["currency_id"] });
      const items = await client.call<OdooRule[]>("product.pricelist.item", "search_read", { domain: [["pricelist_id", "=", odooId]], fields, context: { active_test: false } });
      const tmpl = new Map<number, number[]>();
      for (const [ref, l] of Array.from(links)) if (l.tmplId) tmpl.set(l.tmplId, [...(tmpl.get(l.tmplId) ?? []), Number(ref)]);
      const { rules } = mapRules(items, (t) => tmpl.get(t) ?? [], new Set(sampleable.map((p) => p.ref)));
      const sample = pickSample(rules, sampleable, parents);
      const checks = sample.flatMap((s) => s.quantities.map((quantity) => ({ s, quantity })));
      let failed = 0;
      await pool(checks, async ({ s, quantity }) => {
        const p = sampleable.find((x) => x.ref === s.ref)!;
        const [odoo, crm] = await Promise.all([
          odooPrice(client, { pricelistId: odooId, currencyId: list.currency_id[0], productId: Number(s.ref), quantity }),
          ctx.data.prices.get({ priceListId: link.priceListId, productId: p.id, quantity: String(quantity) }),
        ]);
        const diff = Number(crm.price) - odoo;
        if (Math.abs(diff) < 0.005) return;
        failed++;
        result.mismatches.push({ list: link.name, product: p.name, quantity, crm: crm.price, odoo: String(odoo), diff: diff.toFixed(2),
          reason: !crm.ruleId && p.currency !== list.currency_id[1] ? "rate" : "rule" });
      });
      result.lists.push({ odooId, name: link.name, checked: checks.length, failed });
      await ctx.store.set(K.compareProgress, { done: ++done, total });
    }
  } catch (e) {
    result.ok = false;
    result.error = e instanceof Error ? e.message : String(e);
    ctx.log.error(`Compare with Odoo failed: ${result.error}`);
  } finally {
    await ctx.store.delete(K.lock);
  }
  await ctx.store.set(K.compareLast, result);
}
