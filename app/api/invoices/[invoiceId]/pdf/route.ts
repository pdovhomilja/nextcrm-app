import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticated,
  unauthorizedResponse,
  notFoundOrForbiddenResponse,
  AuthenticationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { canReadInvoice, type InvoiceStatus } from "@/lib/invoices/permissions";
import {
  getInvoicePdfPresignedUrl,
  getInvoicePdfStream,
} from "@/lib/invoices/storage";
import { generateAndStoreInvoicePdf } from "@/lib/invoices/pdf/generate";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return unauthorizedResponse();
    throw e;
  }

  const invoice = await prismadb.invoices.findUnique({
    where: { id: invoiceId },
    select: { createdBy: true, status: true, pdfStorageKey: true },
  });
  if (!invoice) return notFoundOrForbiddenResponse();

  if (
    !canReadInvoice(
      { status: invoice.status as InvoiceStatus, createdBy: invoice.createdBy },
      { id: user.id, role: user.role },
    )
  ) {
    return notFoundOrForbiddenResponse();
  }

  if (!invoice.pdfStorageKey) {
    try {
      const { pdfBuffer } = await generateAndStoreInvoicePdf(invoiceId, "en");
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${invoiceId}.pdf"`,
        },
      });
    } catch (err) {
      console.error("[invoice pdf] on-demand generation failed:", err);
      return NextResponse.json(
        { error: "PDF generation failed. Check server logs for details." },
        { status: 500 },
      );
    }
  }

  const url = await getInvoicePdfPresignedUrl(invoice.pdfStorageKey);
  if (url) return NextResponse.redirect(url);

  const body = await getInvoicePdfStream(invoice.pdfStorageKey);
  const chunks: Uint8Array[] = [];
  for await (const chunk of body) chunks.push(chunk);
  return new NextResponse(Buffer.concat(chunks), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoiceId}.pdf"`,
    },
  });
}
