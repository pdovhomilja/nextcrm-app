import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { issueInvoice } from "@/actions/invoices/issue-invoice";

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
    const body = await request.json().catch(() => ({}));
    const invoice = await issueInvoice({
      invoiceId,
      issueDate: body.issueDate,
      dueDate: body.dueDate,
      taxableSupplyDate: body.taxableSupplyDate,
    });
    return NextResponse.json({ data: invoice });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Failed to issue invoice" },
      { status: 400 }
    );
  }
}
