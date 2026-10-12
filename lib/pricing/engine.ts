import { Decimal } from "decimal.js";
import { PriceListDepthExceeded, PriceListNotFound } from "./errors";
import type { ListData, PriceResult, PriceStep, PricingContext, ProductData, RuleData } from "./types";

const TARGET_RANK = { PRODUCT: 0, CATEGORY: 1, ALL: 2 } as const;
const MAX_DEPTH = 10;
const day = (d: Date) => d.toISOString().slice(0, 10);
const set = (v: Decimal | null) => !!v && !v.isZero();   // Odoo skips 0 like unset

/** Odoo 17 pricelist item _order: product, category, all; then min quantity desc; then deeper category; then newest. */
export function applicableRules(list: ListData, product: ProductData, categoryChain: string[], quantity: Decimal, date: Date): RuleData[] {
  const today = day(date);
  const depth = (id: string | null) => (id ? categoryChain.indexOf(id) : -1);
  return list.rules
    .filter((r) => r.appliesTo === "ALL"
      || (r.appliesTo === "PRODUCT" && r.productId === product.id)
      || (r.appliesTo === "CATEGORY" && depth(r.categoryId) >= 0))
    .filter((r) => r.minQuantity.lte(quantity))
    .filter((r) => (!r.dateStart || day(r.dateStart) <= today) && (!r.dateEnd || day(r.dateEnd) >= today))
    .sort((a, b) =>
      TARGET_RANK[a.appliesTo] - TARGET_RANK[b.appliesTo]
      || b.minQuantity.cmp(a.minQuantity)
      || (a.appliesTo === "CATEGORY" ? depth(a.categoryId) - depth(b.categoryId) : 0)
      || b.createdAt.getTime() - a.createdAt.getTime()
      || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
}

/** Odoo float_round(value, precision_rounding=step), HALF-UP = half away from zero. */
export function roundTo(value: Decimal, step: Decimal): Decimal {
  return value.div(step).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).mul(step);
}

export function computePrice(ctx: PricingContext, listId: string, quantity: Decimal, date: Date, depth = 0): PriceResult {
  if (depth > MAX_DEPTH) throw new PriceListDepthExceeded(listId);
  const list = ctx.lists.get(listId);
  if (!list) throw new PriceListNotFound(listId);
  const { product } = ctx;
  const toList = (amount: Decimal, from: string) => amount.mul(ctx.rate(from, list.currency));
  const listPrice = toList(product.unitPrice, product.currency);
  const done = (price: Decimal, ruleId: string | null, steps: PriceStep[]): PriceResult => ({ price, currency: list.currency, listPrice, ruleId, steps });

  const [rule] = applicableRules(list, product, ctx.categoryChain, quantity, date);
  if (!rule) return done(listPrice, null, [{ label: "fallback", value: listPrice }]);
  if (rule.computePrice === "FIXED") {
    const fixed = rule.fixedPrice ?? new Decimal(0);
    return done(fixed, rule.id, [{ label: "fixed", value: fixed }]);
  }

  let base: Decimal;
  if (rule.base === "COST") base = toList(product.unitCost ?? new Decimal(0), product.currency);
  else if (rule.base === "PRICE_LIST" && rule.basePriceListId) {
    const inner = computePrice(ctx, rule.basePriceListId, quantity, date, depth + 1);
    base = toList(inner.price, inner.currency);
  } else base = listPrice;
  const steps: PriceStep[] = [{ label: "base", value: base }];

  if (rule.computePrice === "PERCENTAGE") {
    const price = base.minus(base.mul(rule.percentPrice ?? 0).div(100));
    steps.push({ label: "percentage", value: price });
    return done(price, rule.id, steps);
  }

  let price = base.minus(base.mul(rule.priceDiscount).div(100));
  steps.push({ label: "discount", value: price });
  if (set(rule.priceRound)) { price = roundTo(price, rule.priceRound!); steps.push({ label: "round", value: price }); }
  if (set(rule.priceSurcharge)) { price = price.plus(rule.priceSurcharge); steps.push({ label: "surcharge", value: price }); }
  if (set(rule.priceMinMargin)) { price = Decimal.max(price, base.plus(rule.priceMinMargin!)); steps.push({ label: "minMargin", value: price }); }
  if (set(rule.priceMaxMargin)) { price = Decimal.min(price, base.plus(rule.priceMaxMargin!)); steps.push({ label: "maxMargin", value: price }); }
  return done(price, rule.id, steps);
}
