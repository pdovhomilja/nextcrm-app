"use server";

import { prismadb } from "@/lib/prisma";
import { getUser } from "@/actions/get-user";
import { Decimal } from "decimal.js";
import { addPaymentSchema } from "@/types/invoice";
import { canAddPayment, type InvoiceStatus } from "@/lib/invoices/permissions";
import { serializeDecimals } from "@/lib/serialize-decimals";

export async function addPayment(raw: unknown) {
  const user = await getUser();
  const input = addPaymentSchema.parse(raw);

  return prismadb.$transaction(async (tx) => {
    const invoice = await tx.invoices.findUniqueOrThrow({
      where: { id: input.invoiceId },
      select: { status: true, createdBy: true, grandTotal: true, paidTotal: true },
    });

    if (
      !canAddPayment(
        { status: invoice.status as InvoiceStatus, createdBy: invoice.createdBy },
        { id: user.id, isAdmin: user.is_admin }
      )
    ) {
      throw new Error("Cannot add payment to this invoice");
    }

    await tx.invoice_Payments.create({
      data: {
        invoiceId: input.invoiceId,
        amount: input.amount,
        paidAt: input.paidAt,
        method: input.method,
        reference: input.reference ?? null,
        note: input.note ?? null,
        createdBy: user.id,
      },
    });

    const newPaidTotal = new Decimal(invoice.paidTotal.toString()).add(
      new Decimal(input.amount)
    );
    const grandTotal = new Decimal(invoice.grandTotal.toString());
    const newBalanceDue = grandTotal.sub(newPaidTotal);
    const newStatus = newBalanceDue.lte(0) ? "PAID" : "PARTIALLY_PAID";

    const updated = await tx.invoices.update({
      where: { id: input.invoiceId },
      data: {
        paidTotal: newPaidTotal.toString(),
        balanceDue: Decimal.max(newBalanceDue, new Decimal(0)).toString(),
        status: newStatus,
        activity: {
          create: {
            actorId: user.id,
            action: "PAYMENT_ADDED",
            meta: { amount: input.amount, method: input.method },
          },
        },
      },
    });

    return serializeDecimals(updated);
  });
}
