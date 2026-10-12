import type { Base, Compute, Target } from "./types";

export type RuleProblem = "categoryRequired" | "productRequired" | "fixedPriceRequired" | "percentRequired" | "percentRange"
  | "baseListRequired" | "baseListSelf" | "dateOrder" | "minQuantityNegative" | "roundPositive" | "marginOrder";

export interface RuleFields {
  appliesTo: Target;
  categoryId?: string | null;
  productId?: string | null;
  minQuantity?: number | null;
  dateStart?: Date | null;
  dateEnd?: Date | null;
  computePrice: Compute;
  fixedPrice?: number | null;
  percentPrice?: number | null;
  base?: Base;
  basePriceListId?: string | null;
  priceDiscount?: number | null;
  priceSurcharge?: number | null;
  priceRound?: number | null;
  priceMinMargin?: number | null;
  priceMaxMargin?: number | null;
}

const has = (v: unknown) => v !== null && v !== undefined && v !== "";

export function ruleProblems(r: RuleFields, priceListId: string): RuleProblem[] {
  const p: RuleProblem[] = [];
  if (r.appliesTo === "CATEGORY" && !has(r.categoryId)) p.push("categoryRequired");
  if (r.appliesTo === "PRODUCT" && !has(r.productId)) p.push("productRequired");
  if (r.computePrice === "FIXED" && !has(r.fixedPrice)) p.push("fixedPriceRequired");
  if (r.computePrice === "PERCENTAGE") {
    if (!has(r.percentPrice)) p.push("percentRequired");
    else if (r.percentPrice! < 0 || r.percentPrice! > 100) p.push("percentRange");
  }
  if (r.computePrice !== "FIXED" && r.base === "PRICE_LIST") {
    if (!has(r.basePriceListId)) p.push("baseListRequired");
    else if (r.basePriceListId === priceListId) p.push("baseListSelf");
  }
  if (r.dateStart && r.dateEnd && r.dateEnd < r.dateStart) p.push("dateOrder");
  if (has(r.minQuantity) && r.minQuantity! < 0) p.push("minQuantityNegative");
  if (r.computePrice === "FORMULA" && has(r.priceRound) && r.priceRound! <= 0) p.push("roundPositive");
  if (r.computePrice === "FORMULA" && has(r.priceMinMargin) && has(r.priceMaxMargin) && r.priceMinMargin! > r.priceMaxMargin!) p.push("marginOrder");
  return p;
}

/** A rule ready to store: always-present columns are non-null. */
export type CleanRule = Omit<Required<RuleFields>, "minQuantity" | "priceDiscount" | "priceSurcharge" | "base">
  & { minQuantity: number; priceDiscount: number; priceSurcharge: number; base: Base };

/** Keeps only the fields that matter for the rule's target, compute type and base (Review Focus 3). */
export function cleanRule(r: RuleFields): CleanRule {
  const formula = r.computePrice === "FORMULA";
  const usesBase = r.computePrice !== "FIXED";
  const base = usesBase ? r.base ?? "LIST_PRICE" : "LIST_PRICE";
  const num = (v: number | null | undefined) => (has(v) ? Number(v) : null);
  return {
    appliesTo: r.appliesTo,
    categoryId: r.appliesTo === "CATEGORY" ? r.categoryId ?? null : null,
    productId: r.appliesTo === "PRODUCT" ? r.productId ?? null : null,
    minQuantity: num(r.minQuantity) ?? 0,
    dateStart: r.dateStart ?? null,
    dateEnd: r.dateEnd ?? null,
    computePrice: r.computePrice,
    fixedPrice: r.computePrice === "FIXED" ? num(r.fixedPrice) : null,
    percentPrice: r.computePrice === "PERCENTAGE" ? num(r.percentPrice) : null,
    base,
    basePriceListId: usesBase && base === "PRICE_LIST" ? r.basePriceListId ?? null : null,
    priceDiscount: formula ? num(r.priceDiscount) ?? 0 : 0,
    priceSurcharge: formula ? num(r.priceSurcharge) ?? 0 : 0,
    priceRound: formula ? num(r.priceRound) : null,
    priceMinMargin: formula ? num(r.priceMinMargin) : null,
    priceMaxMargin: formula ? num(r.priceMaxMargin) : null,
  };
}

/** Would listId → baseListId close a loop through the existing base edges? */
export function createsListCycle(listId: string, baseListId: string, edges: { priceListId: string; basePriceListId: string }[]): boolean {
  const seen = new Set<string>();
  const stack = [baseListId];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === listId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const e of edges) if (e.priceListId === id) stack.push(e.basePriceListId);
  }
  return false;
}

/** Would giving categoryId the parent parentId make the category its own ancestor? */
export function createsCategoryCycle(categoryId: string, parentId: string, parents: Map<string, string | null>): boolean {
  let id: string | null = parentId;
  const seen = new Set<string>();
  while (id) {
    if (id === categoryId) return true;
    if (seen.has(id)) return true;
    seen.add(id);
    id = parents.get(id) ?? null;
  }
  return false;
}
