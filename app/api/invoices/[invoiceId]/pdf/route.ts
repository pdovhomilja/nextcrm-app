import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { getInvoicePdfPresignedUrl } from "@/lib/invoices/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoice = await prismadb.invoices.findUnique({
    where: { id: invoiceId },
    select: { pdfStorageKey: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (!invoice.pdfStorageKey) {
    return NextResponse.json(
      { error: "PDF not yet generated. Issue the invoice first." },
      { status: 404 }
    );
  }

  const url = await getInvoicePdfPresignedUrl(invoice.pdfStorageKey);
  return NextResponse.redirect(url);
}
