import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { addPayment } from "@/actions/invoices/add-payment";

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
    const body = await request.json();
    const invoice = await addPayment({ ...body, invoiceId });
    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Failed to add payment" },
      { status: 400 }
    );
  }
}
