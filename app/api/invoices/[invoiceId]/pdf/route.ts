import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticated,
  unauthorizedResponse,
  notFoundOrForbiddenResponse,
  AuthenticationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { canReadInvoice, type InvoiceStatus } from "@/lib/invoices/permissions";
import { getInvoicePdfPresignedUrl } from "@/lib/invoices/storage";

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
    return NextResponse.json(
      { error: "PDF not yet generated. Issue the invoice first." },
      { status: 404 },
    );
  }

  const url = await getInvoicePdfPresignedUrl(invoice.pdfStorageKey);
  return NextResponse.redirect(url);
}
