"use server";

import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import type { ReportCategory } from "./types";

async function getUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function saveConfig(input: { name: string; category: ReportCategory; filters: Record<string, unknown>; isShared: boolean }) {
  const userId = await getUserId();
  return prismadb.crm_Report_Config.create({ data: { name: input.name, category: input.category, filters: input.filters as Prisma.InputJsonValue, isShared: input.isShared, createdBy: userId } });
}

export async function loadConfigs(category: ReportCategory) {
  const userId = await getUserId();
  return prismadb.crm_Report_Config.findMany({ where: { category, OR: [{ createdBy: userId }, { isShared: true }] }, orderBy: { createdAt: "desc" } });
}

export async function deleteConfig(configId: string) {
  const userId = await getUserId();
  return prismadb.crm_Report_Config.delete({ where: { id: configId, createdBy: userId } });
}

export async function duplicateConfig(configId: string, newName: string) {
  const userId = await getUserId();
  const original = await prismadb.crm_Report_Config.findMany({ where: { id: configId } });
  if (!original[0]) throw new Error("Config not found");
  return prismadb.crm_Report_Config.create({ data: { name: newName, category: original[0].category, filters: original[0].filters as Prisma.InputJsonValue, isShared: false, createdBy: userId } });
}

export async function toggleShare(configId: string, isShared: boolean) {
  const userId = await getUserId();
  return prismadb.crm_Report_Config.update({ where: { id: configId, createdBy: userId }, data: { isShared } });
}
