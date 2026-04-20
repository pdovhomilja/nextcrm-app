import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prismadb } from "@/lib/prisma";
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { InvoiceForm } from "../../components/invoice-form";
import { getInvoiceById } from "../../data/get-invoices";

interface Props {
  params: Promise<{ invoiceId: string }>;
}

export default async function EditInvoicePage({ params }: Props) {
  const { invoiceId } = await params;
  const t = await getTranslations("InvoicesPage");
  const invoice = await getInvoiceById(invoiceId);

  if (!invoice) {
    notFound();
  }

  if (invoice.status !== "DRAFT") {
    redirect(`/invoices/${invoiceId}`);
  }

  const [products, taxRates, series, currencies, settings] =
    await Promise.all([
      prismadb.crm_Products.findMany({
        select: { id: true, name: true },
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
      }),
      prismadb.invoice_TaxRates.findMany({
        where: { active: true },
        orderBy: { rate: "desc" },
      }),
      prismadb.invoice_Series.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      }),
      prismadb.currency.findMany({
        where: { isEnabled: true },
        orderBy: { code: "asc" },
      }),
      prismadb.invoice_Settings.findFirst(),
    ]);

  const formLabels = {
    type: t("form.type"),
    account: t("form.account"),
    currency: t("form.currency"),
    series: t("form.series"),
    dueDate: t("form.dueDate"),
    lineItems: t("form.lineItems"),
    addLine: t("form.addLine"),
    product: t("form.product"),
    description: t("form.description"),
    quantity: t("form.quantity"),
    unitPrice: t("form.unitPrice"),
    discount: t("form.discount"),
    taxRate: t("form.taxRate"),
    total: t("form.total"),
    publicNotes: t("form.publicNotes"),
    internalNotes: t("form.internalNotes"),
    save: t("form.save"),
    bankName: t("form.bankName"),
    iban: t("form.iban"),
    swift: t("form.swift"),
    variableSymbol: t("form.variableSymbol"),
  };

  const initialData = {
    id: invoice.id,
    type: invoice.type,
    accountId: invoice.accountId,
    seriesId: invoice.seriesId,
    currency: invoice.currency,
    dueDate: invoice.dueDate?.toISOString() ?? null,
    bankName: invoice.bankName,
    iban: invoice.iban,
    swift: invoice.swift,
    variableSymbol: invoice.variableSymbol,
    publicNotes: invoice.publicNotes,
    internalNotes: invoice.internalNotes,
    lineItems: invoice.lineItems.map((li) => ({
      productId: li.productId,
      description: li.description,
      quantity: li.quantity.toString(),
      unitPrice: li.unitPrice.toString(),
      discountPercent: li.discountPercent.toString(),
      taxRateId: li.taxRateId,
    })),
  };

  return (
    <Container
      title={`${t("actions.edit")} - ${invoice.number ?? "DRAFT"}`}
      description={t("description")}
    >
      <InvoiceForm
        products={JSON.parse(JSON.stringify(products))}
        taxRates={JSON.parse(JSON.stringify(taxRates))}
        series={JSON.parse(JSON.stringify(series))}
        currencies={JSON.parse(JSON.stringify(currencies))}
        settings={settings ? JSON.parse(JSON.stringify(settings)) : null}
        labels={formLabels}
        initialData={JSON.parse(JSON.stringify(initialData))}
      />
    </Container>
  );
}
