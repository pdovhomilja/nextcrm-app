"use server";

import { prismadb } from "@/lib/prisma";
import { getUser } from "@/actions/get-user";
import { canCancelInvoice, type InvoiceStatus } from "@/lib/invoices/permissions";
import { serializeDecimals } from "@/lib/serialize-decimals";

export async function cancelInvoice(invoiceId: string) {
  const user = await getUser();

  const invoice = await prismadb.invoices.findUniqueOrThrow({
    where: { id: invoiceId },
    select: { status: true, createdBy: true },
  });

  if (
    !canCancelInvoice(
      { status: invoice.status as InvoiceStatus, createdBy: invoice.createdBy },
      { id: user.id, isAdmin: user.is_admin }
    )
  ) {
    throw new Error("Cannot cancel this invoice");
  }

  const updated = await prismadb.invoices.update({
    where: { id: invoiceId },
    data: {
      status: "CANCELLED",
      activity: {
        create: { actorId: user.id, action: "CANCELLED" },
      },
    },
  });

  return serializeDecimals(updated);
}
