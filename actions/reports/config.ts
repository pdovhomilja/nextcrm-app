"use server";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAuthenticated, isManagerOrAdmin, AuthorizationError } from "@/lib/authz";
import { REPORT_CATEGORIES, type ReportCategory } from "./types";

// Strict: a server action takes whatever the client posts.
const configName = z.string().min(1).max(120);
const saveConfigSchema = z.strictObject({
  name: configName,
  category: z.enum(REPORT_CATEGORIES as [ReportCategory, ...ReportCategory[]]),
  filters: z.record(z.string(), z.string()),
  isShared: z.boolean(),
});

export async function saveConfig(input: { name: string; category: ReportCategory; filters: Record<string, unknown>; isShared: boolean }) {
  const user = await requireAuthenticated();
  const parsed = saveConfigSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid input");
  const { name, category, filters, isShared } = parsed.data;
  return prismadb.crm_Report_Config.create({
    data: {
      name,
      category,
      filters,
      isShared,
      createdBy: user.id,
    },
  });
}

export async function loadConfigs(category: ReportCategory) {
  const user = await requireAuthenticated();
  const where: Prisma.crm_Report_ConfigWhereInput = isManagerOrAdmin(user)
    ? { category }
    : { category, OR: [{ createdBy: user.id }, { isShared: true }] };
  return prismadb.crm_Report_Config.findMany({ where, orderBy: { createdAt: "desc" } });
}

async function loadAndAuthorize(configId: string, user: { id: string; role: string }) {
  const cfg = await prismadb.crm_Report_Config.findUnique({ where: { id: configId } });
  if (!cfg) throw new Error("Not found");
  if (user.role !== "admin" && user.role !== "manager" && cfg.createdBy !== user.id) {
    throw new AuthorizationError();
  }
  return cfg;
}

export async function deleteConfig(configId: string) {
  const user = await requireAuthenticated();
  await loadAndAuthorize(configId, user);
  return prismadb.crm_Report_Config.delete({ where: { id: configId } });
}

export async function duplicateConfig(configId: string, newName: string) {
  const user = await requireAuthenticated();
  const parsedName = configName.safeParse(newName);
  if (!parsedName.success) throw new Error("Invalid input");
  const original = await prismadb.crm_Report_Config.findUnique({ where: { id: configId } });
  if (!original) throw new Error("Not found");
  // Read access: own OR shared OR manager/admin
  if (
    !isManagerOrAdmin(user) &&
    original.createdBy !== user.id &&
    !original.isShared
  ) {
    throw new AuthorizationError();
  }
  return prismadb.crm_Report_Config.create({
    data: {
      name: parsedName.data,
      category: original.category,
      filters: original.filters as Prisma.InputJsonValue,
      isShared: false,
      createdBy: user.id,
    },
  });
}

export async function toggleShare(configId: string, isShared: boolean) {
  const user = await requireAuthenticated();
  if (typeof isShared !== "boolean") throw new Error("Invalid input");
  await loadAndAuthorize(configId, user);
  return prismadb.crm_Report_Config.update({ where: { id: configId }, data: { isShared } });
}
