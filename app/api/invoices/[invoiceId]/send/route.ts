import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { sendInvoiceEmail } from "@/actions/invoices/send-invoice-email";

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
    if (!body.to) {
      return NextResponse.json({ error: "Recipient email (to) is required" }, { status: 400 });
    }

    const result = await sendInvoiceEmail({
      invoiceId,
      to: body.to,
      subject: body.subject,
      message: body.message,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Failed to send invoice email" },
      { status: 400 }
    );
  }
}
