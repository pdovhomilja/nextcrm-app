"use server";

import { prismadb } from "@/lib/prisma";
import { getUser } from "@/actions/get-user";
import { Decimal } from "decimal.js";
import { computeInvoiceTotals, computeLineTotal } from "@/lib/invoices/totals";
import { updateInvoiceSchema } from "@/types/invoice";
import { canEditInvoice, type InvoiceStatus } from "@/lib/invoices/permissions";

export async function updateInvoice(invoiceId: string, raw: unknown) {
  const user = await getUser();
  const input = updateInvoiceSchema.parse(raw);

  const existing = await prismadb.invoices.findUniqueOrThrow({
    where: { id: invoiceId },
    select: { status: true, createdBy: true },
  });

  if (
    !canEditInvoice(
      { status: existing.status as InvoiceStatus, createdBy: existing.createdBy },
      { id: user.id, isAdmin: user.is_admin }
    )
  ) {
    throw new Error("Cannot edit this invoice");
  }

  // If lineItems provided, recompute totals
  if (input.lineItems) {
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

    return prismadb.$transaction(async (tx) => {
      // Delete existing line items
      await tx.invoice_LineItems.deleteMany({ where: { invoiceId } });

      // Update invoice with new totals and recreate line items
      const updated = await tx.invoices.update({
        where: { id: invoiceId },
        data: {
          ...buildUpdateData(input),
          subtotal: totals.subtotal.toString(),
          discountTotal: totals.discountTotal.toString(),
          vatTotal: totals.vatTotal.toString(),
          grandTotal: totals.grandTotal.toString(),
          balanceDue: totals.grandTotal.toString(),
          lineItems: {
            create: input.lineItems!.map((l, i) => {
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
            create: { actorId: user.id, action: "UPDATED" },
          },
        },
      });

      return updated;
    });
  }

  // No line items change — simple field update
  return prismadb.invoices.update({
    where: { id: invoiceId },
    data: {
      ...buildUpdateData(input),
      activity: {
        create: { actorId: user.id, action: "UPDATED" },
      },
    },
  });
}

function buildUpdateData(input: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  const fields = [
    "accountId",
    "currency",
    "issueDate",
    "taxableSupplyDate",
    "dueDate",
    "bankName",
    "bankAccount",
    "iban",
    "swift",
    "variableSymbol",
    "publicNotes",
    "internalNotes",
  ] as const;
  for (const f of fields) {
    if (f in input) {
      data[f] = input[f] ?? null;
    }
  }
  return data;
}
