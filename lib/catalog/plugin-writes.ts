import type { Prisma } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import type { ExternalProductInput, ExternalRuleInput } from "@nextcrm/plugin-sdk";
import { writeAuditLog } from "@/lib/audit-log";

const ext = (externalRef: string) => ({ source_externalRef: { source: "EXTERNAL" as const, externalRef } });

async function categoryId(ref: string | null): Promise<string | null> {
  if (!ref) return null;
  const row = await prismadb.crm_ProductCategories.findUnique({ where: ext(ref) });
  if (!row) throw new Error(`Unknown category ref: ${ref}`);
  return row.id;
}

export async function upsertExternalCategory(pluginId: string, ref: string, f: { name: string; parentRef: string | null }) {
  const parentId = await categoryId(f.parentRef);
  const existing = await prismadb.crm_ProductCategories.findUnique({ where: ext(ref) });
  const row = existing
    ? await prismadb.crm_ProductCategories.update({ where: { id: existing.id }, data: { name: f.name, parentId, updatedBy: null } })
    : await prismadb.crm_ProductCategories.create({ data: { name: f.name, parentId, source: "EXTERNAL", externalRef: ref, createdBy: null } });
  return { id: row.id };
}

export async function upsertExternalProduct(pluginId: string, ref: string, f: ExternalProductInput, opts: { adoptBySku?: boolean } = {}) {
  const catId = await categoryId(f.categoryRef);
  const existing = await prismadb.crm_Products.findUnique({ where: ext(ref) });
  const { categoryRef: _c, ...fields } = f;
  const data = { ...fields, categoryId: catId };
  if (f.sku) {
    const clash = await prismadb.crm_Products.findFirst({ where: { sku: f.sku, NOT: { source: "EXTERNAL", externalRef: ref } } });
    // SDK 0.2.5: a live CRM product with the same SKU becomes this plugin's product (same id, so orders and rules keep pointing at it).
    if (clash && !existing && opts.adoptBySku && clash.source === "CRM" && !clash.deletedAt) {
      await prismadb.crm_Products.update({ where: { id: clash.id }, data: { ...data, source: "EXTERNAL", externalRef: ref, updatedBy: null, v: { increment: 1 } } });
      await writeAuditLog({ entityType: "product", entityId: clash.id, action: "updated", changes: [{ field: "source", old: "CRM", new: `EXTERNAL (${pluginId} ${ref})` }] as never, userId: null });
      return { id: clash.id, created: false, adopted: true };
    }
    if (clash) throw new Error(`SKU used by a ${clash.source === "CRM" ? "CRM" : "different external"} product: ${f.sku}`);
  }
  if (existing) {
    await prismadb.crm_Products.update({ where: { id: existing.id }, data: { ...data, updatedBy: null, v: { increment: 1 } } });
    return { id: existing.id, created: false };
  }
  const row = await prismadb.crm_Products.create({ data: { ...data, source: "EXTERNAL", externalRef: ref, createdBy: null } });
  await writeAuditLog({ entityType: "product", entityId: row.id, action: "created", changes: [{ field: "plugin", old: null, new: pluginId }] as never, userId: null });
  return { id: row.id, created: true };
}

export async function replaceExternalPriceList(pluginId: string, ref: string, list: { name: string; currency: string; isActive: boolean }, rules: ExternalRuleInput[]) {
  const existing = await prismadb.crm_PriceLists.findUnique({ where: ext(ref) });
  // Resolve every reference before writing, so a bad rule leaves the list as it was.
  const resolved: Prisma.crm_PriceListRulesCreateManyInput[] = [];
  for (const r of rules) {
    let productId: string | null = null;
    let basePriceListId: string | null = null;
    if (r.productRef) {
      const p = await prismadb.crm_Products.findUnique({ where: ext(r.productRef) });
      if (!p) throw new Error(`Unknown product ref: ${r.productRef}`);
      productId = p.id;
    }
    if (r.basePriceListRef) {
      const b = await prismadb.crm_PriceLists.findUnique({ where: ext(r.basePriceListRef) });
      if (!b) throw new Error(`Unknown base price list ref: ${r.basePriceListRef}`);
      basePriceListId = b.id;
    }
    const { productRef: _p, categoryRef, basePriceListRef: _b, dateStart, dateEnd, ...rest } = r;
    resolved.push({ ...rest, priceListId: "", productId, basePriceListId, categoryId: await categoryId(categoryRef),
      dateStart: dateStart ? new Date(dateStart) : null, dateEnd: dateEnd ? new Date(dateEnd) : null });
  }
  return prismadb.$transaction(async (tx) => {
    const row = existing
      ? await tx.crm_PriceLists.update({ where: { id: existing.id }, data: { ...list, updatedBy: null } })
      : await tx.crm_PriceLists.create({ data: { ...list, source: "EXTERNAL", externalRef: ref, createdBy: null } });
    await tx.crm_PriceListRules.deleteMany({ where: { priceListId: row.id } });
    // Later rules win ties (the engine's last tiebreak is newest createdAt), so callers pass rules in their system's order.
    const t0 = Date.now();
    if (resolved.length) await tx.crm_PriceListRules.createMany({ data: resolved.map((r, i) => ({ ...r, priceListId: row.id, createdAt: new Date(t0 + i) })) });
    return { id: row.id };
  });
}

export async function findExternalProducts() {
  const rows = await prismadb.crm_Products.findMany({ where: { source: "EXTERNAL", deletedAt: null }, select: { id: true, externalRef: true, status: true } });
  return rows.map((r) => ({ id: r.id, ref: r.externalRef as string, status: r.status as string }));
}

export async function findExternalCategories() {
  const rows = await prismadb.crm_ProductCategories.findMany({
    where: { source: "EXTERNAL" },
    select: { id: true, externalRef: true, name: true, parent: { select: { source: true, externalRef: true } } },
  });
  return rows.map((r) => ({ id: r.id, ref: r.externalRef as string, name: r.name, parentRef: r.parent?.source === "EXTERNAL" ? (r.parent.externalRef as string) : null }));
}

export async function findExternalPriceLists() {
  const rows = await prismadb.crm_PriceLists.findMany({ where: { source: "EXTERNAL" }, select: { id: true, externalRef: true, name: true, currency: true, isActive: true } });
  return rows.map((r) => ({ id: r.id, ref: r.externalRef as string, name: r.name, currency: r.currency, isActive: r.isActive }));
}
