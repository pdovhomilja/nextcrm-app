"use server";

import { z } from "zod";
import { prismadb as prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type CrmConfigType =
  | "industry"
  | "contactType"
  | "leadSource"
  | "leadStatus"
  | "leadType"
  | "opportunityType"
  | "salesStage";

export type ConfigValue = { id: string; name: string; usageCount: number };

const nameSchema = z.string().trim().min(1, "Name is required").max(100, "Max 100 characters");

const configMap = {
  industry:        { model: () => prisma.crm_Industry_Type,               countRelation: "accounts",                              updateMany: null },
  contactType:     { model: () => prisma.crm_Contact_Types,               countRelation: "contacts",                              updateMany: () => prisma.crm_Contacts },
  leadSource:      { model: () => prisma.crm_Lead_Sources,                countRelation: "leads",                                 updateMany: () => prisma.crm_Leads },
  leadStatus:      { model: () => prisma.crm_Lead_Statuses,               countRelation: "leads",                                 updateMany: () => prisma.crm_Leads },
  leadType:        { model: () => prisma.crm_Lead_Types,                  countRelation: "leads",                                 updateMany: () => prisma.crm_Leads },
  opportunityType: { model: () => prisma.crm_Opportunities_Type,          countRelation: "assigned_opportunities",                updateMany: null },
  salesStage:      { model: () => prisma.crm_Opportunities_Sales_Stages,  countRelation: "assigned_opportunities_sales_stage",    updateMany: null },
} as const;

const fkField: Record<CrmConfigType, string | null> = {
  industry:        "industry",
  contactType:     "contact_type_id",
  leadSource:      "lead_source_id",
  leadStatus:      "lead_status_id",
  leadType:        "lead_type_id",
  opportunityType: "type",
  salesStage:      "sales_stage",
};

export async function getConfigValues(configType: CrmConfigType): Promise<ConfigValue[]> {
  const { model, countRelation } = configMap[configType];
  const rows = await (model() as any).findMany({
    include: { _count: { select: { [countRelation]: true } } },
    orderBy: { name: "asc" },
  });
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    usageCount: r._count[countRelation] ?? 0,
  }));
}

export async function createConfigValue(configType: CrmConfigType, name: string): Promise<void> {
  const parsed = nameSchema.parse(name);
  const { model } = configMap[configType];
  await (model() as any).create({ data: { name: parsed, v: 0 } });
  revalidatePath("/", "layout");
}

export async function updateConfigValue(
  configType: CrmConfigType,
  id: string,
  name: string
): Promise<void> {
  const parsed = nameSchema.parse(name);
  const { model } = configMap[configType];
  await (model() as any).update({ where: { id }, data: { name: parsed } });
  revalidatePath("/", "layout");
}

export async function deleteConfigValue(
  configType: CrmConfigType,
  id: string,
  replacementId?: string
): Promise<void> {
  if (replacementId !== undefined && replacementId === id) {
    throw new Error("replacementId must differ from id");
  }

  const { model, updateMany } = configMap[configType];

  if (replacementId && !updateMany) {
    throw new Error(`Config type does not support reassignment`);
  }
  const field = fkField[configType];

  if (replacementId && updateMany && field) {
    await prisma.$transaction([
      (updateMany() as any).updateMany({
        where: { [field]: id },
        data: { [field]: replacementId },
      }),
      (model() as any).delete({ where: { id } }),
    ]);
  } else {
    await (model() as any).delete({ where: { id } });
  }

  revalidatePath("/", "layout");
}
