import { Decimal } from "decimal.js";
import { prismadb } from "@/lib/prisma";
import { computePrice } from "./engine";
import { MissingRateError, ProductNotFound } from "./errors";
import type { ListData, PriceResult, ProductData, RuleData } from "./types";

const dec = (v: unknown) => new Decimal(String(v));
const decOrNull = (v: unknown) => (v == null ? null : dec(v));
const MAX_LISTS = 11;
const MAX_CATEGORY_DEPTH = 20;

function toRule(r: Record<string, unknown>): RuleData {
  return {
    id: r.id as string,
    appliesTo: r.appliesTo as RuleData["appliesTo"],
    categoryId: (r.categoryId as string | null) ?? null,
    productId: (r.productId as string | null) ?? null,
    minQuantity: dec(r.minQuantity ?? 0),
    dateStart: (r.dateStart as Date | null) ?? null,
    dateEnd: (r.dateEnd as Date | null) ?? null,
    computePrice: r.computePrice as RuleData["computePrice"],
    fixedPrice: decOrNull(r.fixedPrice),
    percentPrice: decOrNull(r.percentPrice),
    base: r.base as RuleData["base"],
    basePriceListId: (r.basePriceListId as string | null) ?? null,
    priceDiscount: dec(r.priceDiscount ?? 0),
    priceSurcharge: dec(r.priceSurcharge ?? 0),
    priceRound: decOrNull(r.priceRound),
    priceMinMargin: decOrNull(r.priceMinMargin),
    priceMaxMargin: decOrNull(r.priceMaxMargin),
    createdAt: r.createdAt as Date,
  };
}

export function rateLookup(rates: { fromCurrency: string; toCurrency: string; rate: unknown }[]) {
  return (from: string, to: string): Decimal => {
    if (from === to) return new Decimal(1);
    const direct = rates.find((r) => r.fromCurrency === from && r.toCurrency === to);
    if (direct) return dec(direct.rate);
    const inverse = rates.find((r) => r.fromCurrency === to && r.toCurrency === from);
    if (inverse) return new Decimal(1).div(dec(inverse.rate));
    throw new MissingRateError(from, to);
  };
}

async function loadLists(rootId: string): Promise<Map<string, ListData>> {
  const lists = new Map<string, ListData>();
  const queue = [rootId];
  while (queue.length && lists.size < MAX_LISTS) {
    const id = queue.shift()!;
    if (lists.has(id)) continue;
    const row = await prismadb.crm_PriceLists.findUnique({ where: { id }, include: { rules: true } });
    if (!row) continue;   // the engine throws PriceListNotFound if it needs this list
    lists.set(id, { id: row.id, currency: row.currency, rules: row.rules.map((r) => toRule(r as unknown as Record<string, unknown>)) });
    for (const r of row.rules) if (r.base === "PRICE_LIST" && r.basePriceListId) queue.push(r.basePriceListId);
  }
  return lists;
}

async function categoryChain(categoryId: string | null): Promise<string[]> {
  const chain: string[] = [];
  let id = categoryId;
  while (id && chain.length < MAX_CATEGORY_DEPTH && !chain.includes(id)) {
    chain.push(id);
    const row = await prismadb.crm_ProductCategories.findUnique({ where: { id }, select: { parentId: true } });
    id = row?.parentId ?? null;
  }
  return chain;
}

export async function getPrice(input: { priceListId: string | null; productId: string; quantity: Decimal | number | string; date?: Date }): Promise<PriceResult> {
  const row = await prismadb.crm_Products.findFirst({ where: { id: input.productId, deletedAt: null } });
  if (!row) throw new ProductNotFound(input.productId);
  const product: ProductData = { id: row.id, unitPrice: dec(row.unit_price), unitCost: decOrNull(row.unit_cost), currency: row.currency, categoryId: row.categoryId };
  if (!input.priceListId) {
    return { price: product.unitPrice, currency: product.currency, listPrice: product.unitPrice, ruleId: null, steps: [{ label: "fallback", value: product.unitPrice }] };
  }
  const [lists, chain, rates] = await Promise.all([loadLists(input.priceListId), categoryChain(product.categoryId), prismadb.exchangeRate.findMany()]);
  return computePrice({ lists, product, categoryChain: chain, rate: rateLookup(rates) }, input.priceListId, dec(input.quantity), input.date ?? new Date());
}

/** Account list → instance default list → null (product unit price). */
export async function resolvePriceListId(accountId: string | null): Promise<string | null> {
  if (accountId) {
    const account = await prismadb.crm_Accounts.findFirst({ where: { id: accountId, deletedAt: null }, select: { pricelist_id: true } });
    if (account?.pricelist_id) return account.pricelist_id;
  }
  const setting = await prismadb.crm_SystemSettings.findUnique({ where: { key: "default_pricelist_id" } });
  return setting?.value || null;
}
