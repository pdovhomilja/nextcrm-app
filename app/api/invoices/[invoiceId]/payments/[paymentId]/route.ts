import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { deletePayment } from "@/actions/invoices/delete-payment";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string; paymentId: string }> }
) {
  const { paymentId } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invoice = await deletePayment(paymentId);
    return NextResponse.json({ data: invoice });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Failed to delete payment" },
      { status: 400 }
    );
  }
}
