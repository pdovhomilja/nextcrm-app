"use server";

import { prismadb } from "@/lib/prisma";
import { getUser } from "@/actions/get-user";
import { Decimal } from "decimal.js";
import { computeInvoiceTotals } from "@/lib/invoices/totals";
import { canIssueInvoice, type InvoiceStatus } from "@/lib/invoices/permissions";
import { consumeNextNumber } from "@/lib/invoices/numbering";
import { fetchFxRate } from "@/lib/invoices/fx";
import { issueInvoiceSchema } from "@/types/invoice";
import { renderInvoicePdf } from "@/lib/invoices/pdf/render";
import { uploadInvoicePdf } from "@/lib/invoices/storage";
import type { InvoicePdfData, PdfParty } from "@/lib/invoices/pdf/templates/default-invoice";
import { serializeDecimals } from "@/lib/serialize-decimals";

export async function issueInvoice(raw: unknown) {
  const user = await getUser();
  const input = issueInvoiceSchema.parse(raw);

  // Read invoice and settings outside the transaction to avoid holding locks during network calls
  const invoice = await prismadb.invoices.findUniqueOrThrow({
    where: { id: input.invoiceId },
    include: {
      lineItems: { include: { taxRate: true } },
      account: true,
    },
  });

  if (
    !canIssueInvoice(
      { status: invoice.status as InvoiceStatus, createdBy: invoice.createdBy },
      { id: user.id, isAdmin: user.is_admin }
    )
  ) {
    throw new Error("Cannot issue this invoice");
  }

  if (invoice.lineItems.length === 0) {
    throw new Error("Invoice must have at least one line item");
  }

  const settings = await prismadb.invoice_Settings.findFirst();
  if (!settings) {
    throw new Error("Invoice settings not configured. Please configure in Admin > Invoices.");
  }

  const seriesId = invoice.seriesId ?? settings.defaultSeriesId;
  if (!seriesId) {
    throw new Error("No invoice series configured");
  }

  // Fetch FX rate outside the transaction (network call)
  const fxRate = await fetchFxRate(invoice.currency, settings.baseCurrency);

  const result = await prismadb.$transaction(
    async (tx) => {
      const { number } = await consumeNextNumber(tx, seriesId);

      // Snapshot account billing info (customer)
      const acct = invoice.account;
      const billingSnapshot = {
        name: acct.name,
        street: acct.billing_street ?? null,
        city: acct.billing_city ?? null,
        zip: acct.billing_postal_code ?? null,
        state: acct.billing_state ?? null,
        country: acct.billing_country ?? null,
        vat_id: acct.vat ?? null,
        registration_id: acct.company_id ?? null,
      };

      // Snapshot per-line taxRateSnapshot and recompute totals
      const lineInputs = invoice.lineItems.map((li) => ({
        quantity: new Decimal(li.quantity.toString()),
        unitPrice: new Decimal(li.unitPrice.toString()),
        discountPercent: new Decimal(li.discountPercent.toString()),
        taxRate: li.taxRate ? new Decimal(li.taxRate.rate.toString()) : new Decimal(0),
      }));
      const totals = computeInvoiceTotals(lineInputs);

      // Update each line item with taxRateSnapshot
      for (const li of invoice.lineItems) {
        const snapshotRate = li.taxRate ? li.taxRate.rate : null;
        await tx.invoice_LineItems.update({
          where: { id: li.id },
          data: { taxRateSnapshot: snapshotRate },
        });
      }

      const issueDate = input.issueDate ?? new Date();
      const taxableSupplyDate = input.taxableSupplyDate ?? issueDate;
      const dueDate =
        input.dueDate ??
        invoice.dueDate ??
        new Date(issueDate.getTime() + settings.defaultDueDays * 24 * 60 * 60 * 1000);

      // Update invoice
      const updated = await tx.invoices.update({
        where: { id: invoice.id },
        data: {
          status: "ISSUED",
          number,
          seriesId,
          issueDate,
          taxableSupplyDate,
          dueDate,
          billingSnapshot,
          baseCurrency: settings.baseCurrency,
          fxRateToBase: fxRate.toString(),
          subtotal: totals.subtotal.toString(),
          discountTotal: totals.discountTotal.toString(),
          vatTotal: totals.vatTotal.toString(),
          grandTotal: totals.grandTotal.toString(),
          balanceDue: totals.grandTotal.toString(),
          activity: {
            create: { actorId: user.id, action: "ISSUED" },
          },
        },
        include: {
          lineItems: { include: { taxRate: true }, orderBy: { position: "asc" } },
          account: true,
        },
      });

      return updated;
    },
    { isolationLevel: "Serializable" }
  );

  // After transaction: generate PDF (non-blocking for the legal issuance)
  try {
    const customer: PdfParty = {
      name: result.account.name,
      street: result.account.billing_street ?? undefined,
      city: result.account.billing_city ?? undefined,
      zip: result.account.billing_postal_code ?? undefined,
      country: result.account.billing_country ?? undefined,
      vatId: result.account.vat ?? undefined,
      regId: result.account.company_id ?? undefined,
    };

    // Supplier info — use company details from Invoice_Settings (fallback to app name)
    const settings = await prismadb.invoice_Settings.findFirst();
    const supplier: PdfParty = {
      name:
        settings?.companyName ??
        process.env.NEXT_PUBLIC_APP_NAME ??
        "NextCRM",
      street: settings?.companyAddress ?? undefined,
      city: settings?.companyCity ?? undefined,
      zip: settings?.companyZip ?? undefined,
      country: settings?.companyCountry ?? undefined,
      vatId: settings?.companyVatId ?? undefined,
      regId: settings?.companyRegNo ?? undefined,
    };

    const pdfData: InvoicePdfData = {
      type: result.type as InvoicePdfData["type"],
      number: result.number!,
      issueDate: result.issueDate!.toISOString().slice(0, 10),
      dueDate: result.dueDate?.toISOString().slice(0, 10),
      taxableSupplyDate: result.taxableSupplyDate?.toISOString().slice(0, 10),
      locale: user.userLanguage ?? "en",
      currency: result.currency,
      supplier,
      customer,
      lineItems: result.lineItems.map((li) => ({
        position: li.position,
        description: li.description,
        quantity: li.quantity.toString(),
        unitPrice: li.unitPrice.toString(),
        discountPercent: li.discountPercent.toString(),
        taxRate: li.taxRate ? li.taxRate.rate.toString() : "0",
        lineTotal: li.lineTotal.toString(),
      })),
      subtotal: result.subtotal.toString(),
      vatTotal: result.vatTotal.toString(),
      grandTotal: result.grandTotal.toString(),
      vatBreakdown: computeInvoiceTotals(
        result.lineItems.map((li) => ({
          quantity: new Decimal(li.quantity.toString()),
          unitPrice: new Decimal(li.unitPrice.toString()),
          discountPercent: new Decimal(li.discountPercent.toString()),
          taxRate: li.taxRate ? new Decimal(li.taxRate.rate.toString()) : new Decimal(0),
        }))
      ).vatBreakdown,
      payment: {
        bankName: result.bankName ?? settings?.bankName ?? undefined,
        iban: result.iban ?? settings?.iban ?? undefined,
        swift: result.swift ?? settings?.swift ?? undefined,
        variableSymbol: result.variableSymbol ?? undefined,
      },
      publicNotes: result.publicNotes ?? undefined,
    };

    const pdfBuffer = await renderInvoicePdf(pdfData);
    const storageKey = await uploadInvoicePdf(result.id, pdfBuffer);

    await prismadb.invoices.update({
      where: { id: result.id },
      data: { pdfStorageKey: storageKey, pdfGeneratedAt: new Date() },
    });
  } catch (err) {
    console.error("[ISSUE_INVOICE] PDF generation failed:", err);
    // Do NOT fail — invoice is legally issued
  }

  return serializeDecimals(result);
}
