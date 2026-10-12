"use server";
import { revalidatePath } from "next/cache";
import { prismadb } from "@/lib/prisma";
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";

const KEY = "default_pricelist_id";

export async function getDefaultPriceListId(): Promise<string | null> {
  const row = await prismadb.crm_SystemSettings.findUnique({ where: { key: KEY } });
  return row?.value || null;
}

export async function setDefaultPriceList(id: string | null): Promise<{ data: true } | { error: string }> {
  try { await requireRole(["admin"]); } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }
  if (!id) {
    await prismadb.crm_SystemSettings.deleteMany({ where: { key: KEY } });
  } else {
    const list = await prismadb.crm_PriceLists.findUnique({ where: { id } });
    if (!list || !list.isActive) return { error: "Not found" };
    await prismadb.crm_SystemSettings.upsert({ where: { key: KEY }, create: { key: KEY, value: id }, update: { value: id } });
  }
  revalidatePath("/[locale]/(routes)/admin/pricing", "page");
  return { data: true };
}
