"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prismadb } from "@/lib/prisma";
import { getUser } from "@/actions/get-user";

const requiredStr = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} must be ≤ ${max} chars`);

const optionalStr = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .or(z.literal("").transform(() => null));

const settingsSchema = z.object({
  baseCurrency: z.string().length(3, "Currency must be a 3-letter code"),
  defaultSeriesId: z.uuid().nullable(),
  defaultTaxRateId: z.uuid().nullable(),
  defaultDueDays: z
    .number({ error: "Default due days is required" })
    .int("Must be a whole number")
    .min(1, "Must be at least 1 day")
    .max(365, "Must be at most 365 days"),

  bankName: optionalStr(200),
  bankAccount: optionalStr(100),
  iban: optionalStr(50),
  swift: optionalStr(20),
  footerText: optionalStr(1000),

  // Required company identity fields
  companyName: requiredStr("Company name", 200),
  companyAddress: requiredStr("Street address", 300),
  companyCity: requiredStr("City", 100),
  companyZip: requiredStr("ZIP / postal code", 20),
  companyCountry: requiredStr("Country", 100),
  companyRegNo: requiredStr("Registration number", 50),

  // Optional company fields
  companyVatId: optionalStr(50),
  companyTaxId: optionalStr(50),
  companyEmail: z
    .email("Invalid email")
    .max(200)
    .nullable()
    .or(z.literal("").transform(() => null)),
  companyPhone: optionalStr(50),
  companyWebsite: optionalStr(300),
});

export type InvoiceSettingsInput = z.infer<typeof settingsSchema>;

export type FieldErrors = Record<string, string>;

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export async function saveInvoiceSettings(
  input: InvoiceSettingsInput
): Promise<ActionResult> {
  let user;
  try {
    user = await getUser();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }
  if (!user.is_admin) return { ok: false, error: "Forbidden" };

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return {
      ok: false,
      error: "Please fix the highlighted fields",
      fieldErrors,
    };
  }
  const data = parsed.data;

  try {
    const existing = await prismadb.invoice_Settings.findFirst();
    const settings = existing
      ? await prismadb.invoice_Settings.update({
          where: { id: existing.id },
          data,
        })
      : await prismadb.invoice_Settings.create({ data });

    revalidatePath("/admin/invoices/settings");
    return { ok: true, data: settings };
  } catch (err) {
    console.error("[saveInvoiceSettings] failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: message };
  }
}
