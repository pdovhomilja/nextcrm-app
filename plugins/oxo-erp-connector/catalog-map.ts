import type { ExternalCategory, ExternalProductInput, ExternalRuleInput } from "@nextcrm/plugin-sdk";
import type { OxoProduct, OxoRule } from "./oxo";
import type { ProductLink } from "./store";

export const SEP = " / ";

/** Each external CRM category's full path ("Zásoby / Výrobky / K ČKS", OXO ERP's form) → its ref; a parent loop ends the path. */
export function categoryPaths(rows: ExternalCategory[]): Map<string, string> {
  const byRef = new Map(rows.map((r) => [r.ref, r]));
  const path = (r: ExternalCategory, seen: Set<string>): string => {
    const parent = r.parentRef ? byRef.get(r.parentRef) : undefined;
    if (!parent || seen.has(parent.ref) || parent.ref === r.ref) return r.name;
    seen.add(r.ref);
    return `${path(parent, seen)}${SEP}${r.name}`;
  };
  return new Map(rows.map((r) => [path(r, new Set()), r.ref]));
}

/** Spec § 10 A5: OXO ERP sends no tax, cost or description; those keep the CRM's value. */
export function productFields(p: OxoProduct, categoryRef: string | null, currency: string, current: Record<string, unknown> | null): ExternalProductInput {
  const keep = (k: string) => (current?.[k] != null ? String(current[k]) : null);
  return {
    name: p.name,
    sku: p.code || null,
    description: keep("description"),
    type: p.kind === "SERVICE" ? "SERVICE" : "PRODUCT",
    status: p.active && p.saleOk ? "ACTIVE" : "ARCHIVED",
    unit_price: p.listPrice ?? "0",
    unit_cost: keep("unit_cost"),
    currency,
    tax_rate: keep("tax_rate"),
    unit: p.unit,
    categoryRef,
  };
}

/** True when the stored product already has these values (decimals compared as numbers). */
export function sameProduct(row: Record<string, unknown> | null, f: ExternalProductInput, link: ProductLink | undefined): boolean {
  if (!row || !link) return false;
  const num = (a: unknown, b: string | null) => (a == null || b == null ? a == b : Number(a) === Number(b));
  return row.name === f.name && (row.sku ?? null) === f.sku && (row.description ?? null) === f.description && row.type === f.type
    && row.status === f.status && num(row.unit_price, f.unit_price) && num(row.unit_cost, f.unit_cost) && row.currency === f.currency
    && num(row.tax_rate, f.tax_rate) && (row.unit ?? null) === f.unit && link.categoryRef === f.categoryRef;
}

const COMPUTE = { FIXED: "FIXED", PERCENT: "PERCENTAGE" } as const;
const newness = (r: OxoRule) => r.odooId ?? 1e9 + r.id;   // OXO ERP's own tiebreak: native rules are newer than mirrored ones

/**
 * Spec § 4.3: OXO ERP rules → core rules, oldest first (core lets later rules win ties). A rule on a product the CRM lacks is left
 * out silently (OXO ERP has rules on products the CRM never imports); a category or base list the CRM lacks is skipped and listed.
 */
export function mapRules(
  rules: OxoRule[], products: Map<number, string>, templates: Map<number, string[]>,
  categoryRef: (path: string) => string | null, listRef: (oxoId: number) => string | null,
): { rules: ExternalRuleInput[]; skipped: { ruleId: number; reason: string }[] } {
  const out: ExternalRuleInput[] = [];
  const skipped: { ruleId: number; reason: string }[] = [];
  for (const r of [...rules].sort((a, b) => newness(a) - newness(b))) {
    const key = r.odooId != null ? String(r.odooId) : `oxo:${r.id}`;
    const baseRef = r.base === "PRICE_LIST" && r.basePriceListId != null ? listRef(r.basePriceListId) : null;
    if (r.base === "PRICE_LIST" && !baseRef) { skipped.push({ ruleId: r.id, reason: `base list ${r.basePriceListId ?? "-"} not imported` }); continue; }
    const common = {
      minQuantity: r.minQty, dateStart: null, dateEnd: null, computePrice: COMPUTE[r.kind],
      fixedPrice: r.kind === "FIXED" ? (r.fixedPrice ?? "0") : null, percentPrice: r.kind === "PERCENT" ? (r.percent ?? "0") : null,
      base: r.base, basePriceListRef: baseRef, priceDiscount: "0", priceSurcharge: "0", priceRound: null, priceMinMargin: null, priceMaxMargin: null,
    } satisfies Omit<ExternalRuleInput, "appliesTo" | "productRef" | "categoryRef" | "externalRef">;
    if (r.appliesTo === "ALL") out.push({ ...common, appliesTo: "ALL", productRef: null, categoryRef: null, externalRef: key });
    else if (r.appliesTo === "CATEGORY") {
      const c = r.categoryName ? categoryRef(r.categoryName) : null;
      if (c) out.push({ ...common, appliesTo: "CATEGORY", productRef: null, categoryRef: c, externalRef: key });
      else skipped.push({ ruleId: r.id, reason: `category ${r.categoryName ?? "-"} not in the CRM` });
    } else if (r.productId != null) {
      const p = products.get(r.productId);
      if (p) out.push({ ...common, appliesTo: "PRODUCT", productRef: p, categoryRef: null, externalRef: key });
    } else if (r.productTemplateOdooId != null) {
      for (const p of templates.get(r.productTemplateOdooId) ?? []) out.push({ ...common, appliesTo: "PRODUCT", productRef: p, categoryRef: null, externalRef: `${key}:${p}` });
    }
  }
  return { rules: out, skipped };
}

/** Topological order, bases first; lists on or behind a cycle are cyclic, lists whose chain is larger than maxChain are tooDeep. */
export function orderLists(deps: Map<number, number[]>, maxChain = Infinity): { order: number[]; cyclic: number[]; tooDeep: number[] } {
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
  const chain = new Map<number, Set<number>>();
  for (const id of order) chain.set(id, new Set([id, ...(deps.get(id) ?? []).flatMap((b) => Array.from(chain.get(b) ?? []))]));
  const tooDeep = order.filter((id) => chain.get(id)!.size > maxChain).sort((a, b) => a - b);
  return {
    order: order.filter((id) => !tooDeep.includes(id)),
    cyclic: Array.from(state.entries()).filter(([, v]) => v === "bad").map(([k]) => k).sort((a, b) => a - b),
    tooDeep,
  };
}

/** A short fingerprint of a list's content: replace only when it changes. */
export function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16);
}
