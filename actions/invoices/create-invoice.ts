"use server";

import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanWriteAccount,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { Decimal } from "decimal.js";
import { computeInvoiceTotals, computeLineTotal } from "@/lib/invoices/totals";
import { createInvoiceSchema } from "@/types/invoice";
import { serializeDecimals } from "@/lib/serialize-decimals";

export async function createInvoice(raw: unknown) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) throw new Error("Unauthorized");
    throw e;
  }
  const input = createInvoiceSchema.parse(raw);

  try {
    await assertCanWriteAccount(user, input.accountId);
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw e;
  }

  const taxRates = await prismadb.invoice_TaxRates.findMany({
    where: {
      id: {
        in: input.lineItems
          .map((l) => l.taxRateId)
          .filter(Boolean) as string[],
      },
    },
  });
  const rateMap = new Map(
    taxRates.map((t) => [t.id, new Decimal(t.rate.toString())])
  );

  const lineInputs = input.lineItems.map((l) => ({
    quantity: new Decimal(l.quantity),
    unitPrice: new Decimal(l.unitPrice),
    discountPercent: new Decimal(l.discountPercent),
    taxRate: l.taxRateId
      ? (rateMap.get(l.taxRateId) ?? new Decimal(0))
      : new Decimal(0),
  }));
  const totals = computeInvoiceTotals(lineInputs);

  const invoice = await prismadb.invoices.create({
    data: {
      type: input.type,
      status: "DRAFT",
      createdBy: user.id,
      accountId: input.accountId,
      seriesId: input.seriesId ?? null,
      currency: input.currency,
      dueDate: input.dueDate ?? null,
      publicNotes: input.publicNotes ?? null,
      internalNotes: input.internalNotes ?? null,
      bankName: input.bankName ?? null,
      bankAccount: input.bankAccount ?? null,
      iban: input.iban ?? null,
      swift: input.swift ?? null,
      variableSymbol: input.variableSymbol ?? null,
      originalInvoiceId: input.originalInvoiceId ?? null,
      subtotal: totals.subtotal.toString(),
      discountTotal: totals.discountTotal.toString(),
      vatTotal: totals.vatTotal.toString(),
      grandTotal: totals.grandTotal.toString(),
      balanceDue: totals.grandTotal.toString(),
      lineItems: {
        create: input.lineItems.map((l, i) => {
          const lt = computeLineTotal(lineInputs[i]);
          return {
            position: l.position ?? i,
            productId: l.productId ?? null,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountPercent: l.discountPercent,
            taxRateId: l.taxRateId ?? null,
            lineSubtotal: lt.lineSubtotal.toString(),
            lineVat: lt.lineVat.toString(),
            lineTotal: lt.lineTotal.toString(),
          };
        }),
      },
      activity: {
        create: { actorId: user.id, action: "CREATED" },
      },
    },
  });

  return serializeDecimals(invoice);
}
