import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { duplicateInvoice } from "@/actions/invoices/duplicate-invoice";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invoice = await duplicateInvoice(invoiceId);
    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Failed to duplicate invoice" },
      { status: 400 }
    );
  }
}
