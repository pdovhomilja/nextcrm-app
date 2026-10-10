"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";
import { previewNumber } from "@/lib/orders/numbering";

const KEY = "orders_approval_emails";
const schema = z.object({
  name: z.string().trim().min(1).max(100),
  template: z.string().trim().min(1).max(60).regex(/\{#+\}/),
  resetPolicy: z.enum(["YEARLY", "NEVER"]),
  active: z.boolean(),
  emails: z.boolean(),
});

async function defaultSeries() {
  return prismadb.numberSeries.findFirst({ where: { scope: "order", isDefault: true }, orderBy: { createdAt: "asc" } });
}

export async function getOrderSettings() {
  await requireRole(["admin"]);
  const [series, setting] = await Promise.all([defaultSeries(), prismadb.crm_SystemSettings.findUnique({ where: { key: KEY } })]);
  return {
    name: series?.name ?? "", template: series?.template ?? "", resetPolicy: (series?.resetPolicy ?? "YEARLY") as "YEARLY" | "NEVER",
    active: series?.active ?? false, emails: setting?.value !== "false",
    preview: series ? previewNumber(series.template, series.counter) : "",
  };
}

export async function saveOrderSettings(input: z.input<typeof schema>): Promise<{ data: { ok: true } } | { error: string }> {
  try { await requireRole(["admin"]); } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const series = await defaultSeries();
  if (!series) return { error: "invalid" };
  const { emails, ...data } = parsed.data;
  await prismadb.numberSeries.update({ where: { id: series.id }, data });
  await prismadb.crm_SystemSettings.upsert({ where: { key: KEY }, update: { value: String(emails) }, create: { key: KEY, value: String(emails) } });
  revalidatePath("/[locale]/(routes)/admin/orders", "page");
  return { data: { ok: true } };
}
