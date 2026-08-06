import { revalidatePath } from "next/cache";
import { prismadb } from "@/lib/prisma";
import { buildInvoicePdfData } from "@/lib/invoices/pdf/build-pdf-data";
import { renderInvoicePdf } from "@/lib/invoices/pdf/render";
import { uploadInvoicePdf } from "@/lib/invoices/storage";

export interface GeneratedInvoicePdf {
  pdfStorageKey: string;
  pdfBuffer: Buffer;
  pdfGeneratedAt: Date;
}

/**
 * Builds, renders and stores the PDF for an invoice, then persists the storage
 * key. Works for drafts too (renders a "DRAFT" placeholder number/date).
 * Callers are responsible for authorization.
 */
export async function generateAndStoreInvoicePdf(
  invoiceId: string,
  locale = "en"
): Promise<GeneratedInvoicePdf> {
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

  const settings = await prismadb.invoice_Settings.findFirst();

  const pdfData = buildInvoicePdfData(invoice, settings, locale);
  const pdfBuffer = await renderInvoicePdf(pdfData);
  const pdfStorageKey = await uploadInvoicePdf(invoice.id, pdfBuffer);
  const pdfGeneratedAt = new Date();

  await prismadb.invoices.update({
    where: { id: invoice.id },
    data: { pdfStorageKey, pdfGeneratedAt },
  });

  revalidatePath(`/invoices/${invoiceId}`);
  return { pdfStorageKey, pdfBuffer, pdfGeneratedAt };
}
