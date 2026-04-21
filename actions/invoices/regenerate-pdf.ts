"use server";

import { revalidatePath } from "next/cache";
import { prismadb } from "@/lib/prisma";
import { getUser } from "@/actions/get-user";
import { renderInvoicePdf } from "@/lib/invoices/pdf/render";
import { uploadInvoicePdf } from "@/lib/invoices/storage";
import { buildInvoicePdfData } from "@/lib/invoices/pdf/build-pdf-data";

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
      include: {
        lineItems: {
          include: { taxRate: true },
          orderBy: { position: "asc" },
        },
        account: true,
      },
    });

    // Permission: admin OR the creator of the invoice
    if (!user.is_admin && invoice.createdBy !== user.id) {
      return { ok: false, error: "Forbidden" };
    }

    if (invoice.status === "DRAFT") {
      return {
        ok: false,
        error: "Draft invoices don't have PDFs — issue the invoice first",
      };
    }

    if (!invoice.number || !invoice.issueDate) {
      return {
        ok: false,
        error: "Invoice is missing number or issue date",
      };
    }

    const settings = await prismadb.invoice_Settings.findFirst();

    const pdfData = buildInvoicePdfData(
      invoice,
      settings,
      user.userLanguage ?? "en"
    );

    const pdfBuffer = await renderInvoicePdf(pdfData);
    const storageKey = await uploadInvoicePdf(invoice.id, pdfBuffer);

    const pdfGeneratedAt = new Date();
    await prismadb.invoices.update({
      where: { id: invoice.id },
      data: { pdfStorageKey: storageKey, pdfGeneratedAt },
    });

    revalidatePath(`/invoices/${invoiceId}`);
    return { ok: true, pdfGeneratedAt: pdfGeneratedAt.toISOString() };
  } catch (err) {
    console.error("[regenerateInvoicePdf] failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: message };
  }
}
