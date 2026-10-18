import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticated,
  unauthorizedResponse,
  notFoundOrForbiddenResponse,
  AuthenticationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { invoiceReadScopeWhere } from "@/lib/invoices/permissions";
import { getInvoicePdfPresignedUrl } from "@/lib/invoices/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  let user;
  try {
    user = await requireAuthenticated({ partner: true });
  } catch (e) {
    if (e instanceof AuthenticationError) return unauthorizedResponse();
    throw e;
  }

  // Same read scope as the invoice list: a partner can open the PDFs of
  // his accounts' invoices; every invoice write still refuses him.
  const invoice = await prismadb.invoices.findFirst({
    where: { id: invoiceId, ...invoiceReadScopeWhere(user) },
    select: { pdfStorageKey: true },
  });
  if (!invoice) return notFoundOrForbiddenResponse();

  if (!invoice.pdfStorageKey) {
    return NextResponse.json(
      { error: "PDF not yet generated. Issue the invoice first." },
      { status: 404 },
    );
  }

  const url = await getInvoicePdfPresignedUrl(invoice.pdfStorageKey);
  return NextResponse.redirect(url);
}
