import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getUser } from "@/actions/get-user";
import { prismadb } from "@/lib/prisma";
import { updateInvoice } from "@/actions/invoices/update-invoice";

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
    include: {
      account: { select: { id: true, name: true, email: true } },
      series: { select: { id: true, name: true } },
      lineItems: {
        orderBy: { position: "asc" },
        include: {
          taxRate: { select: { id: true, name: true, rate: true } },
          product: { select: { id: true, name: true } },
        },
      },
      payments: { orderBy: { paidAt: "desc" } },
      activity: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ data: invoice });
}

export async function PATCH(
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
    const invoice = await updateInvoice(invoiceId, body);
    return NextResponse.json({ data: invoice });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Failed to update invoice" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUser();

  const invoice = await prismadb.invoices.findUnique({
    where: { id: invoiceId },
    select: { status: true, createdBy: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.createdBy !== user.id && !user.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (invoice.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft invoices can be deleted" },
      { status: 400 }
    );
  }

  await prismadb.invoices.delete({ where: { id: invoiceId } });

  return NextResponse.json({ success: true });
}
