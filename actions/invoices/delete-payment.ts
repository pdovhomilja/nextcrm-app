"use server";

import { prismadb } from "@/lib/prisma";
import { getUser } from "@/actions/get-user";
import { Decimal } from "decimal.js";

export async function deletePayment(paymentId: string) {
  const user = await getUser();

  if (!user.is_admin) {
    throw new Error("Only admins can delete payments");
  }

  return prismadb.$transaction(async (tx) => {
    const payment = await tx.invoice_Payments.findUniqueOrThrow({
      where: { id: paymentId },
      select: { invoiceId: true, amount: true },
    });

    await tx.invoice_Payments.delete({ where: { id: paymentId } });

    const invoice = await tx.invoices.findUniqueOrThrow({
      where: { id: payment.invoiceId },
      select: { grandTotal: true, paidTotal: true, status: true },
    });

    const newPaidTotal = new Decimal(invoice.paidTotal.toString()).sub(
      new Decimal(payment.amount.toString())
    );
    const grandTotal = new Decimal(invoice.grandTotal.toString());
    const newBalanceDue = grandTotal.sub(newPaidTotal);

    let newStatus = invoice.status;
    if (newPaidTotal.lte(0)) {
      // Revert to the most recent non-payment status
      // If it was PAID or PARTIALLY_PAID, go back to SENT or ISSUED
      if (invoice.status === "PAID" || invoice.status === "PARTIALLY_PAID") {
        newStatus = "ISSUED";
      }
    } else if (newBalanceDue.gt(0)) {
      newStatus = "PARTIALLY_PAID";
    }

    const updated = await tx.invoices.update({
      where: { id: payment.invoiceId },
      data: {
        paidTotal: Decimal.max(newPaidTotal, new Decimal(0)).toString(),
        balanceDue: Decimal.max(newBalanceDue, new Decimal(0)).toString(),
        status: newStatus,
        activity: {
          create: {
            actorId: user.id,
            action: "PAYMENT_DELETED",
            meta: { paymentId, amount: payment.amount.toString() },
          },
        },
      },
    });

    return updated;
  });
}
