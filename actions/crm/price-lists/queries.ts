"use server";
import { prismadb } from "@/lib/prisma";
import { requireAuthenticated } from "@/lib/authz";

const num = (v: unknown) => (v == null ? null : Number(v));

export type PriceListRow = { id: string; name: string; currency: string; isActive: boolean; source: "CRM" | "EXTERNAL"; ruleCount: number; usedAsBase: boolean; updatedAt: Date };

export async function getPriceLists(opts: { includeArchived?: boolean } = {}): Promise<PriceListRow[]> {
  await requireAuthenticated();
  const rows = await prismadb.crm_PriceLists.findMany({
    where: opts.includeArchived ? {} : { isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { rules: true, baseFor: true } } },
  });
  return rows.map((r) => ({ id: r.id, name: r.name, currency: r.currency, isActive: r.isActive, source: r.source, ruleCount: r._count.rules, usedAsBase: r._count.baseFor > 0, updatedAt: r.updatedAt }));
}

export async function getPriceList(id: string) {
  await requireAuthenticated();
  const row = await prismadb.crm_PriceLists.findUnique({
    where: { id },
    include: { _count: { select: { baseFor: true } }, rules: { include: { product: { select: { name: true } }, category: { select: { name: true } }, basePriceList: { select: { name: true } } } } },
  });
  if (!row) return null;
  return {
    id: row.id, name: row.name, currency: row.currency, isActive: row.isActive, source: row.source, usedAsBase: row._count.baseFor > 0,
    rules: row.rules.map((r) => ({
      id: r.id, appliesTo: r.appliesTo, categoryId: r.categoryId, productId: r.productId, minQuantity: num(r.minQuantity) ?? 0,
      dateStart: r.dateStart?.toISOString().slice(0, 10) ?? null, dateEnd: r.dateEnd?.toISOString().slice(0, 10) ?? null,
      computePrice: r.computePrice, fixedPrice: num(r.fixedPrice), percentPrice: num(r.percentPrice), base: r.base,
      basePriceListId: r.basePriceListId, priceDiscount: num(r.priceDiscount) ?? 0, priceSurcharge: num(r.priceSurcharge) ?? 0,
      priceRound: num(r.priceRound), priceMinMargin: num(r.priceMinMargin), priceMaxMargin: num(r.priceMaxMargin),
      createdAt: r.createdAt.toISOString(),
      productName: r.product?.name ?? null, categoryName: r.category?.name ?? null, basePriceListName: r.basePriceList?.name ?? null,
    })),
  };
}
export type PriceListDetail = NonNullable<Awaited<ReturnType<typeof getPriceList>>>;

export async function getPriceListOptions() {
  await requireAuthenticated();
  return prismadb.crm_PriceLists.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, currency: true } });
}
