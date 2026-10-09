"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, assertCanWritePriceList, AuthenticationError, AuthorizationError } from "@/lib/authz";
import { writeAuditLog } from "@/lib/audit-log";
import { cleanRule, createsListCycle, ruleProblems, type RuleFields } from "@/lib/pricing/validate";
import { getPrice } from "@/lib/pricing/get-price";
import { PricingError } from "@/lib/pricing/errors";

type Result<T> = { data: T } | { error: string };
export type CheckedPrice = { price: string; listPrice: string; currency: string; ruleId: string | null; steps: { label: string; value: string }[] };

const PATH = "/[locale]/(routes)/crm/price-lists";
const listSchema = z.object({ name: z.string().trim().min(1).max(200), currency: z.string().length(3) });

async function signedIn() {
  try { return await requireAuthenticated(); } catch (e) { if (e instanceof AuthenticationError) return null; throw e; }
}

/** Resolves the caller and the list, and enforces assertCanWritePriceList. */
async function writer(listId: string | null): Promise<{ userId: string } | { error: string }> {
  const user = await signedIn();
  if (!user) return { error: "Unauthorized" };
  const list = listId ? await prismadb.crm_PriceLists.findUnique({ where: { id: listId } }) : null;
  if (listId && !list) return { error: "Not found" };
  try { assertCanWritePriceList(user, list); } catch (e) { if (e instanceof AuthorizationError) return { error: "Forbidden" }; throw e; }
  return { userId: user.id };
}

async function enabledCurrency(code: string) {
  return !!(await prismadb.currency.findFirst({ where: { code, isEnabled: true } }));
}

export async function createPriceList(input: { name: string; currency: string }): Promise<Result<{ id: string }>> {
  const w = await writer(null);
  if ("error" in w) return w;
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid:name" };
  if (!(await enabledCurrency(parsed.data.currency))) return { error: "Currency is not enabled" };
  const row = await prismadb.crm_PriceLists.create({ data: { ...parsed.data, createdBy: w.userId, updatedBy: w.userId } });
  await writeAuditLog({ entityType: "price_list", entityId: row.id, action: "created", changes: null, userId: w.userId });
  revalidatePath(PATH, "page");
  return { data: { id: row.id } };
}

export async function updatePriceList(id: string, input: { name: string; currency: string; isActive: boolean }): Promise<Result<{ id: string }>> {
  const w = await writer(id);
  if ("error" in w) return w;
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid:name" };
  if (!(await enabledCurrency(parsed.data.currency))) return { error: "Currency is not enabled" };
  await prismadb.crm_PriceLists.update({ where: { id }, data: { ...parsed.data, isActive: !!input.isActive, updatedBy: w.userId } });
  await writeAuditLog({ entityType: "price_list", entityId: id, action: "updated", changes: null, userId: w.userId });
  revalidatePath(PATH, "page");
  return { data: { id } };
}

export async function archivePriceList(id: string): Promise<Result<{ id: string }>> {
  const w = await writer(id);
  if ("error" in w) return w;
  await prismadb.crm_PriceLists.update({ where: { id }, data: { isActive: false, updatedBy: w.userId } });
  await writeAuditLog({ entityType: "price_list", entityId: id, action: "updated", changes: { isActive: { from: true, to: false } } as never, userId: w.userId });
  revalidatePath(PATH, "page");
  return { data: { id } };
}

export async function deletePriceList(id: string): Promise<Result<{ id: string }>> {
  const w = await writer(id);
  if ("error" in w) return w;
  const [accounts, bases] = await Promise.all([
    prismadb.crm_Accounts.count({ where: { pricelist_id: id } }),
    prismadb.crm_PriceListRules.count({ where: { basePriceListId: id } }),
  ]);
  if (accounts > 0 || bases > 0) return { error: "inUse" };
  await prismadb.crm_PriceLists.delete({ where: { id } });
  await writeAuditLog({ entityType: "price_list", entityId: id, action: "deleted", changes: null, userId: w.userId });
  revalidatePath(PATH, "page");
  return { data: { id } };
}

export async function upsertPriceListRule(priceListId: string, ruleId: string | null, input: RuleFields): Promise<Result<{ id: string }>> {
  const w = await writer(priceListId);
  if ("error" in w) return w;
  const problems = ruleProblems(input, priceListId);
  if (problems.length) return { error: `invalid:${problems.join(",")}` };
  const data = cleanRule(input);
  if (data.basePriceListId) {
    const baseList = await prismadb.crm_PriceLists.findUnique({ where: { id: data.basePriceListId } });
    if (!baseList) return { error: "baseListNotFound" };
    const edges = (await prismadb.crm_PriceListRules.findMany({
      where: { basePriceListId: { not: null }, ...(ruleId ? { id: { not: ruleId } } : {}) },
      select: { priceListId: true, basePriceListId: true },
    })) as { priceListId: string; basePriceListId: string }[];
    if (createsListCycle(priceListId, data.basePriceListId, edges)) return { error: "cycle" };
  }
  const row = ruleId
    ? await prismadb.crm_PriceListRules.update({ where: { id: ruleId }, data })
    : await prismadb.crm_PriceListRules.create({ data: { ...data, priceListId } });
  await writeAuditLog({ entityType: "price_list_rule", entityId: row.id, action: ruleId ? "updated" : "created", changes: null, userId: w.userId });
  revalidatePath(PATH, "page");
  return { data: { id: row.id } };
}

export async function deletePriceListRule(ruleId: string): Promise<Result<{ id: string }>> {
  const rule = await prismadb.crm_PriceListRules.findUnique({ where: { id: ruleId } });
  if (!rule) return { error: "Not found" };
  const w = await writer(rule.priceListId);
  if ("error" in w) return w;
  await prismadb.crm_PriceListRules.delete({ where: { id: ruleId } });
  await writeAuditLog({ entityType: "price_list_rule", entityId: ruleId, action: "deleted", changes: null, userId: w.userId });
  revalidatePath(PATH, "page");
  return { data: { id: ruleId } };
}

export async function checkPrice(input: { priceListId: string | null; productId: string; quantity: number; date?: string }): Promise<Result<CheckedPrice>> {
  if (!(await signedIn())) return { error: "Unauthorized" };
  try {
    const r = await getPrice({ priceListId: input.priceListId, productId: input.productId, quantity: input.quantity, date: input.date ? new Date(input.date) : undefined });
    return { data: {
      price: r.price.toFixed(2), listPrice: r.listPrice.toFixed(2), currency: r.currency, ruleId: r.ruleId,
      steps: r.steps.map((s) => ({ label: s.label, value: s.value.toFixed(2) })),
    } };
  } catch (e) {
    if (e instanceof PricingError) return { error: e.message };
    throw e;
  }
}
