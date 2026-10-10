import type { ExternalProductInput, ExternalRuleInput } from "@nextcrm/plugin-sdk";
import type { M2O } from "./map";

export interface OdooVariant {
  id: number; display_name: string; default_code: string | false; description_sale: string | false; type: string;
  active: boolean; sale_ok: boolean; lst_price: number; standard_price: number; currency_id: M2O; taxes_id: number[];
  uom_id: M2O; categ_id: M2O; product_tmpl_id: M2O; write_date: string;
}
export interface OdooCategory { id: number; name: string; parent_id: M2O }
export interface OdooRule {
  id: number; applied_on: string; product_tmpl_id: M2O; product_id: M2O; categ_id: M2O; min_quantity: number;
  date_start: string | false; date_end: string | false; compute_price: string; fixed_price: number; percent_price: number;
  base: string; base_pricelist_id: M2O; price_discount: number; price_markup?: number; price_surcharge: number;
  price_round: number; price_min_margin: number; price_max_margin: number;
}

export const VARIANT_FIELDS = ["id", "display_name", "default_code", "description_sale", "type", "active", "sale_ok", "lst_price", "standard_price", "currency_id", "taxes_id", "uom_id", "categ_id", "product_tmpl_id", "write_date"];
export const RULE_FIELDS = ["id", "applied_on", "product_tmpl_id", "product_id", "categ_id", "min_quantity", "date_start", "date_end", "compute_price", "fixed_price", "percent_price", "base", "base_pricelist_id", "price_discount", "price_markup", "price_surcharge", "price_round", "price_min_margin", "price_max_margin", "write_date"];

const s = (n: number) => String(n);
const orNull = (n: number) => (n ? String(n) : null);

export function categoryOrder(cats: OdooCategory[]): OdooCategory[] {
  const byId = new Map(cats.map((c) => [c.id, c]));
  const depth = (c: OdooCategory, seen = new Set<number>()): number =>
    c.parent_id && byId.has(c.parent_id[0]) && !seen.has(c.id) ? 1 + depth(byId.get(c.parent_id[0])!, seen.add(c.id)) : 0;
  return [...cats].sort((a, b) => depth(a) - depth(b) || a.id - b.id);
}

export function variantFields(v: OdooVariant, taxRate: (ids: number[]) => string | null): ExternalProductInput {
  return {
    name: v.display_name,
    sku: v.default_code || null,
    description: v.description_sale || null,
    type: v.type === "service" ? "SERVICE" : "PRODUCT",
    status: v.active && v.sale_ok ? "ACTIVE" : "ARCHIVED",
    unit_price: s(v.lst_price),
    unit_cost: s(v.standard_price),
    currency: v.currency_id ? v.currency_id[1] : "",
    tax_rate: taxRate(v.taxes_id),
    unit: v.uom_id ? v.uom_id[1] : null,
    categoryRef: v.categ_id ? s(v.categ_id[0]) : null,
  };
}

const COMPUTE: Record<string, ExternalRuleInput["computePrice"]> = { fixed: "FIXED", percentage: "PERCENTAGE", formula: "FORMULA" };
const BASE: Record<string, ExternalRuleInput["base"]> = { list_price: "LIST_PRICE", standard_price: "COST", pricelist: "PRICE_LIST" };

export function mapRules(items: OdooRule[], variantsOf: (tmplId: number) => number[], known: Set<string>) {
  const rules: ExternalRuleInput[] = [];
  const skipped: { ruleId: number; reason: string }[] = [];
  for (const it of items) {
    const compute = COMPUTE[it.compute_price];
    const base = BASE[it.base];
    if (!compute) { skipped.push({ ruleId: it.id, reason: `compute_price ${it.compute_price}` }); continue; }
    if (!base) { skipped.push({ ruleId: it.id, reason: `base ${it.base}` }); continue; }
    const common: Omit<ExternalRuleInput, "appliesTo" | "productRef" | "categoryRef" | "externalRef"> = {
      minQuantity: s(it.min_quantity ?? 0),
      dateStart: it.date_start || null,
      dateEnd: it.date_end || null,
      computePrice: compute,
      fixedPrice: compute === "FIXED" ? s(it.fixed_price) : null,
      percentPrice: compute === "PERCENTAGE" ? s(it.percent_price) : null,
      base,
      basePriceListRef: base === "PRICE_LIST" && it.base_pricelist_id ? s(it.base_pricelist_id[0]) : null,
      // Ruling 4: Odoo 18+ cost rules use price_markup; core applies priceDiscount to every base.
      priceDiscount: s(base === "COST" && it.price_markup ? -it.price_markup : it.price_discount ?? 0),
      priceSurcharge: s(it.price_surcharge ?? 0),
      priceRound: orNull(it.price_round),
      priceMinMargin: orNull(it.price_min_margin),
      priceMaxMargin: orNull(it.price_max_margin),
    };
    if (it.applied_on === "3_global") rules.push({ ...common, appliesTo: "ALL", productRef: null, categoryRef: null, externalRef: s(it.id) });
    else if (it.applied_on === "2_product_category" && it.categ_id) rules.push({ ...common, appliesTo: "CATEGORY", productRef: null, categoryRef: s(it.categ_id[0]), externalRef: s(it.id) });
    else if (it.applied_on === "0_product_variant" && it.product_id) {
      if (known.has(s(it.product_id[0]))) rules.push({ ...common, appliesTo: "PRODUCT", productRef: s(it.product_id[0]), categoryRef: null, externalRef: s(it.id) });
    } else if (it.applied_on === "1_product" && it.product_tmpl_id) {
      for (const vid of variantsOf(it.product_tmpl_id[0])) {
        if (known.has(s(vid))) rules.push({ ...common, appliesTo: "PRODUCT", productRef: s(vid), categoryRef: null, externalRef: `${it.id}:${vid}` });
      }
    } else skipped.push({ ruleId: it.id, reason: `applied_on ${it.applied_on}` });
  }
  return { rules, skipped };
}

export function baseRefs(items: OdooRule[]): number[] {
  return Array.from(new Set(items.filter((i) => i.base === "pricelist" && i.base_pricelist_id).map((i) => (i.base_pricelist_id as [number, string])[0])));
}

/** Topological order, bases first; lists on or behind a cycle are returned as cyclic. */
export function orderLists(deps: Map<number, number[]>): { order: number[]; cyclic: number[] } {
  const order: number[] = [];
  const state = new Map<number, "visiting" | "done" | "bad">();
  const visit = (id: number): boolean => {
    const st = state.get(id);
    if (st === "done") return true;
    if (st === "visiting" || st === "bad") { state.set(id, "bad"); return false; }
    state.set(id, "visiting");
    const ok = (deps.get(id) ?? []).map(visit).every(Boolean);
    state.set(id, ok ? "done" : "bad");
    if (ok) order.push(id);
    return ok;
  };
  for (const id of Array.from(deps.keys()).sort((a, b) => a - b)) visit(id);
  return { order, cyclic: Array.from(state.entries()).filter(([, v]) => v === "bad").map(([k]) => k).sort((a, b) => a - b) };
}
