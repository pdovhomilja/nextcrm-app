"use server";

import { prismadb } from "@/lib/prisma";
import { getUser } from "@/actions/get-user";

export async function duplicateInvoice(invoiceId: string) {
  const user = await getUser();

  const source = await prismadb.invoices.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { lineItems: { orderBy: { position: "asc" } } },
  });

  return prismadb.invoices.create({
    data: {
      type: source.type,
      status: "DRAFT",
      createdBy: user.id,
      accountId: source.accountId,
      seriesId: source.seriesId,
      currency: source.currency,
      dueDate: source.dueDate,
      publicNotes: source.publicNotes,
      internalNotes: source.internalNotes,
      bankName: source.bankName,
      bankAccount: source.bankAccount,
      iban: source.iban,
      swift: source.swift,
      variableSymbol: source.variableSymbol,
      originalInvoiceId: source.originalInvoiceId,
      subtotal: source.subtotal,
      discountTotal: source.discountTotal,
      vatTotal: source.vatTotal,
      grandTotal: source.grandTotal,
      balanceDue: source.grandTotal,
      lineItems: {
        create: source.lineItems.map((li) => ({
          position: li.position,
          productId: li.productId,
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          discountPercent: li.discountPercent,
          taxRateId: li.taxRateId,
          lineSubtotal: li.lineSubtotal,
          lineVat: li.lineVat,
          lineTotal: li.lineTotal,
        })),
      },
      activity: {
        create: {
          actorId: user.id,
          action: "DUPLICATED",
          meta: { sourceInvoiceId: invoiceId },
        },
      },
    },
  });
}
