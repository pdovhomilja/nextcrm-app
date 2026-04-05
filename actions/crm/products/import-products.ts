"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import Papa from "papaparse";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";

const REQUIRED_FIELDS = ["name", "type", "unit_price", "currency"];
const MAX_ROWS = 500;

export async function importProducts(
  formData: FormData
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided");

  const text = await file.text();
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (data.length > MAX_ROWS) {
    throw new Error(`Import limited to ${MAX_ROWS} rows. File contains ${data.length} rows.`);
  }

  const [categories, currencies, existingSkus] = await Promise.all([
    prismadb.crm_ProductCategories.findMany({ where: { isActive: true } }),
    prismadb.currency.findMany({ where: { isEnabled: true } }),
    prismadb.crm_Products.findMany({
      where: { sku: { not: null } },
      select: { sku: true },
    }),
  ]);

  const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
  const currencyCodes = new Set(currencies.map((c) => c.code));
  const existingSkuSet = new Set(existingSkus.map((p) => p.sku?.toLowerCase()));
  const seenSkus = new Set<string>();

  const valid: any[] = [];
  const errors: string[] = [];

  data.forEach((row, index) => {
    const rowNum = index + 2;

    const missing = REQUIRED_FIELDS.filter((f) => !row[f]?.trim());
    if (missing.length > 0) {
      errors.push(`Row ${rowNum}: missing required fields: ${missing.join(", ")}`);
      return;
    }

    const type = row.type?.trim().toUpperCase();
    if (type !== "PRODUCT" && type !== "SERVICE") {
      errors.push(`Row ${rowNum}: invalid type "${row.type}" (must be PRODUCT or SERVICE)`);
      return;
    }

    const currency = row.currency?.trim().toUpperCase();
    if (!currencyCodes.has(currency)) {
      errors.push(`Row ${rowNum}: unknown currency "${row.currency}"`);
      return;
    }

    const unitPrice = parseFloat(row.unit_price);
    if (isNaN(unitPrice) || unitPrice < 0) {
      errors.push(`Row ${rowNum}: invalid unit_price "${row.unit_price}"`);
      return;
    }

    let unitCost: number | undefined;
    if (row.unit_cost?.trim()) {
      unitCost = parseFloat(row.unit_cost);
      if (isNaN(unitCost) || unitCost < 0) {
        errors.push(`Row ${rowNum}: invalid unit_cost "${row.unit_cost}"`);
        return;
      }
    }

    let taxRate: number | undefined;
    if (row.tax_rate?.trim()) {
      taxRate = parseFloat(row.tax_rate);
      if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
        errors.push(`Row ${rowNum}: invalid tax_rate "${row.tax_rate}" (must be 0-100)`);
        return;
      }
    }

    const sku = row.sku?.trim() || null;
    if (sku) {
      const skuLower = sku.toLowerCase();
      if (existingSkuSet.has(skuLower)) {
        errors.push(`Row ${rowNum}: SKU "${sku}" already exists`);
        return;
      }
      if (seenSkus.has(skuLower)) {
        errors.push(`Row ${rowNum}: duplicate SKU "${sku}" in file`);
        return;
      }
      seenSkus.add(skuLower);
    }

    let categoryId: string | undefined;
    if (row.category?.trim()) {
      categoryId = categoryMap.get(row.category.trim().toLowerCase());
      if (!categoryId) {
        errors.push(`Row ${rowNum}: unknown category "${row.category}"`);
        return;
      }
    }

    const isRecurring = row.is_recurring?.trim().toLowerCase() === "true";
    let billingPeriod: string | undefined;
    if (isRecurring) {
      billingPeriod = row.billing_period?.trim().toUpperCase();
      if (!["MONTHLY", "QUARTERLY", "ANNUALLY", "ONE_TIME"].includes(billingPeriod || "")) {
        errors.push(`Row ${rowNum}: recurring product requires valid billing_period (MONTHLY, QUARTERLY, ANNUALLY, ONE_TIME)`);
        return;
      }
    }

    valid.push({
      name: row.name.trim(),
      description: row.description?.trim() || null,
      sku,
      type,
      status: "DRAFT",
      unit_price: unitPrice,
      unit_cost: unitCost ?? null,
      currency,
      tax_rate: taxRate ?? null,
      unit: row.unit?.trim() || null,
      is_recurring: isRecurring,
      billing_period: isRecurring ? billingPeriod : null,
      categoryId: categoryId ?? null,
      createdBy: userId,
      updatedBy: userId,
    });
  });

  if (valid.length > 0) {
    await prismadb.crm_Products.createMany({
      data: valid,
      skipDuplicates: true,
    });

    await writeAuditLog({
      entityType: "product",
      entityId: "bulk_import",
      action: "imported",
      changes: [{ field: "count", old: null, new: valid.length }],
      userId,
    });
  }

  revalidatePath("/[locale]/(routes)/crm/products", "page");
  return { imported: valid.length, skipped: errors.length, errors };
}
