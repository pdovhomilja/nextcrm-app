"use server";

import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanWriteAccount,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { canReadInvoice, type InvoiceStatus } from "@/lib/invoices/permissions";
import { serializeDecimals } from "@/lib/serialize-decimals";

export async function duplicateInvoice(invoiceId: string) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) throw new Error("Unauthorized");
    throw e;
  }

  const source = await prismadb.invoices.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { lineItems: { orderBy: { position: "asc" } } },
  });

  if (
    !canReadInvoice(
      { status: source.status as InvoiceStatus, createdBy: source.createdBy },
      { id: user.id, role: user.role },
    )
  ) {
    throw new Error("Forbidden");
  }

  try {
    await assertCanWriteAccount(user, source.accountId);
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw e;
  }

  const invoice = await prismadb.invoices.create({
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
      originalInvoiceId: source.id,
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

  return serializeDecimals(invoice);
}
