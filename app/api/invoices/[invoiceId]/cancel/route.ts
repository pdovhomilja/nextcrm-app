import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { cancelInvoice } from "@/actions/invoices/cancel-invoice";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invoice = await cancelInvoice(invoiceId);
    return NextResponse.json({ data: invoice });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Failed to cancel invoice" },
      { status: 400 }
    );
  }
}
