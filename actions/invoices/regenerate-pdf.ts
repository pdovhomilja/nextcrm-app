"use server";

import { prismadb } from "@/lib/prisma";
import { getUser } from "@/actions/get-user";
import { mapLegacyRole } from "@/lib/authz";
import { canReadInvoice, type InvoiceStatus } from "@/lib/invoices/permissions";
import { generateAndStoreInvoicePdf } from "@/lib/invoices/pdf/generate";

export type RegenerateResult =
  | { ok: true; pdfGeneratedAt: string }
  | { ok: false; error: string };

export async function regenerateInvoicePdf(
  invoiceId: string
): Promise<RegenerateResult> {
  let user;
  try {
    user = await getUser();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const invoice = await prismadb.invoices.findUniqueOrThrow({
      where: { id: invoiceId },
      select: { status: true, createdBy: true, number: true, issueDate: true },
    });

    // Permission: manager/admin OR the creator of the invoice
    if (
      !canReadInvoice(
        { status: invoice.status as InvoiceStatus, createdBy: invoice.createdBy },
        { id: user.id, role: mapLegacyRole(user.role) },
      )
    ) {
      return { ok: false, error: "Forbidden" };
    }

    if (invoice.status !== "DRAFT" && (!invoice.number || !invoice.issueDate)) {
      return {
        ok: false,
        error: "Invoice is missing number or issue date",
      };
    }

    const { pdfGeneratedAt } = await generateAndStoreInvoicePdf(
      invoiceId,
      user.userLanguage ?? "en"
    );

    return { ok: true, pdfGeneratedAt: pdfGeneratedAt.toISOString() };
  } catch (err) {
    console.error("[regenerateInvoicePdf] failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: message };
  }
}
