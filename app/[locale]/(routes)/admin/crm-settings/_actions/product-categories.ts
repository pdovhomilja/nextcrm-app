"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";
import { writeAuditLog } from "@/lib/audit-log";
import { createsCategoryCycle } from "@/lib/pricing/validate";

const schema = z.object({ name: z.string().trim().min(1).max(100), parentId: z.string().min(1).nullable(), isActive: z.boolean() });

async function admin() {
  try { return await requireRole(["admin"]); } catch (e) {
    if (e instanceof AuthenticationError || e instanceof AuthorizationError) return null;
    throw e;
  }
}

export async function listProductCategories() {
  if (!(await admin())) return [];
  const rows = await prismadb.crm_ProductCategories.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  return rows.map((r) => ({ id: r.id, name: r.name, parentId: r.parentId, isActive: r.isActive, productCount: r._count.products }));
}

export async function saveProductCategory(input: { id?: string; name: string; parentId: string | null; isActive: boolean }): Promise<{ data: { id: string } } | { error: string }> {
  const user = await admin();
  if (!user) return { error: "Forbidden" };
  const { id, ...data } = input;
  if (!schema.safeParse(data).success) return { error: "invalid:name" };
  if (id && data.parentId) {
    const all = await prismadb.crm_ProductCategories.findMany({ select: { id: true, parentId: true } });
    if (createsCategoryCycle(id, data.parentId, new Map(all.map((c) => [c.id, c.parentId])))) return { error: "cycle" };
  }
  const row = id
    ? await prismadb.crm_ProductCategories.update({ where: { id }, data: { ...data, updatedBy: user.id } })
    : await prismadb.crm_ProductCategories.create({ data: { ...data, createdBy: user.id, updatedBy: user.id } });
  await writeAuditLog({ entityType: "product_category", entityId: row.id, action: id ? "updated" : "created", changes: null, userId: user.id });
  revalidatePath("/[locale]/(routes)/admin/crm-settings", "page");
  return { data: { id: row.id } };
}
