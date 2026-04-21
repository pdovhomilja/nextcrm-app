import { Decimal } from "decimal.js";
import { computeInvoiceTotals } from "@/lib/invoices/totals";
import type {
  InvoicePdfData,
  PdfParty,
} from "@/lib/invoices/pdf/templates/default-invoice";

type BillingSnapshot = {
  name?: string | null;
  street?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: string | null;
  vat_id?: string | null;
  registration_id?: string | null;
};

type InvoiceForPdf = {
  id: string;
  type: string;
  number: string | null;
  issueDate: Date | null;
  dueDate: Date | null;
  taxableSupplyDate: Date | null;
  currency: string;
  subtotal: unknown;
  vatTotal: unknown;
  grandTotal: unknown;
  billingSnapshot: unknown;
  bankName: string | null;
  iban: string | null;
  swift: string | null;
  variableSymbol: string | null;
  publicNotes: string | null;
  account: {
    name: string;
    billing_street: string | null;
    billing_city: string | null;
    billing_postal_code: string | null;
    billing_country: string | null;
    vat: string | null;
    company_id: string | null;
  };
  lineItems: Array<{
    position: number;
    description: string;
    quantity: unknown;
    unitPrice: unknown;
    discountPercent: unknown;
    lineTotal: unknown;
    taxRate: { rate: unknown } | null;
  }>;
};

type SettingsForPdf = {
  companyName: string | null;
  companyAddress: string | null;
  companyCity: string | null;
  companyZip: string | null;
  companyCountry: string | null;
  companyVatId: string | null;
  companyRegNo: string | null;
  bankName: string | null;
  iban: string | null;
  swift: string | null;
} | null;

function buildSupplier(settings: SettingsForPdf): PdfParty {
  return {
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
}

function buildCustomer(invoice: InvoiceForPdf): PdfParty {
  const snap = (invoice.billingSnapshot ?? null) as BillingSnapshot | null;
  if (snap && snap.name) {
    return {
      name: snap.name,
      street: snap.street ?? undefined,
      city: snap.city ?? undefined,
      zip: snap.zip ?? undefined,
      country: snap.country ?? undefined,
      vatId: snap.vat_id ?? undefined,
      regId: snap.registration_id ?? undefined,
    };
  }
  return {
    name: invoice.account.name,
    street: invoice.account.billing_street ?? undefined,
    city: invoice.account.billing_city ?? undefined,
    zip: invoice.account.billing_postal_code ?? undefined,
    country: invoice.account.billing_country ?? undefined,
    vatId: invoice.account.vat ?? undefined,
    regId: invoice.account.company_id ?? undefined,
  };
}

export function buildInvoicePdfData(
  invoice: InvoiceForPdf,
  settings: SettingsForPdf,
  locale: string
): InvoicePdfData {
  if (!invoice.number || !invoice.issueDate) {
    throw new Error("Invoice is not yet issued — cannot build PDF data");
  }

  const vatBreakdown = computeInvoiceTotals(
    invoice.lineItems.map((li) => ({
      quantity: new Decimal(String(li.quantity)),
      unitPrice: new Decimal(String(li.unitPrice)),
      discountPercent: new Decimal(String(li.discountPercent)),
      taxRate: li.taxRate ? new Decimal(String(li.taxRate.rate)) : new Decimal(0),
    }))
  ).vatBreakdown;

  return {
    type: invoice.type as InvoicePdfData["type"],
    number: invoice.number,
    issueDate: invoice.issueDate.toISOString().slice(0, 10),
    dueDate: invoice.dueDate?.toISOString().slice(0, 10),
    taxableSupplyDate: invoice.taxableSupplyDate?.toISOString().slice(0, 10),
    locale,
    currency: invoice.currency,
    supplier: buildSupplier(settings),
    customer: buildCustomer(invoice),
    lineItems: invoice.lineItems.map((li) => ({
      position: li.position,
      description: li.description,
      quantity: String(li.quantity),
      unitPrice: String(li.unitPrice),
      discountPercent: String(li.discountPercent),
      taxRate: li.taxRate ? String(li.taxRate.rate) : "0",
      lineTotal: String(li.lineTotal),
    })),
    subtotal: String(invoice.subtotal),
    vatTotal: String(invoice.vatTotal),
    grandTotal: String(invoice.grandTotal),
    vatBreakdown,
    payment: {
      bankName: invoice.bankName ?? settings?.bankName ?? undefined,
      iban: invoice.iban ?? settings?.iban ?? undefined,
      swift: invoice.swift ?? settings?.swift ?? undefined,
      variableSymbol: invoice.variableSymbol ?? undefined,
    },
    publicNotes: invoice.publicNotes ?? undefined,
  };
}
