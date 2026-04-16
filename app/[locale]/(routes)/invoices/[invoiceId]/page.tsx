import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getInvoiceById } from "../data/get-invoices";
import { StatusBadge } from "../components/status-badge";
import { InvoiceActions } from "./components/invoice-actions";
import { PaymentList } from "./components/payment-list";
import { ActivityLog } from "./components/activity-log";

interface Props {
  params: Promise<{ invoiceId: string }>;
}

function formatDate(d: Date | string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString();
}

function formatCurrency(amount: string | number, currency: string) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return String(amount);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "CZK",
    minimumFractionDigits: 2,
  }).format(num);
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { invoiceId } = await params;
  const t = await getTranslations("InvoicesPage");
  const invoice = await getInvoiceById(invoiceId);

  if (!invoice) {
    notFound();
  }

  const statusLabels: Record<string, string> = {
    DRAFT: t("status.DRAFT"),
    ISSUED: t("status.ISSUED"),
    SENT: t("status.SENT"),
    PARTIALLY_PAID: t("status.PARTIALLY_PAID"),
    PAID: t("status.PAID"),
    OVERDUE: t("status.OVERDUE"),
    CANCELLED: t("status.CANCELLED"),
    DISPUTED: t("status.DISPUTED"),
    REFUNDED: t("status.REFUNDED"),
    WRITTEN_OFF: t("status.WRITTEN_OFF"),
  };

  const billing =
    (invoice.billingSnapshot as Record<string, string> | null) ?? {};
  const accountEmail =
    (invoice.account as { email?: string } | null)?.email ?? undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            {invoice.number ?? "DRAFT"}
          </h1>
          <Badge variant="secondary">{invoice.type}</Badge>
          <StatusBadge status={invoice.status} labels={statusLabels} />
        </div>
        <InvoiceActions
          invoiceId={invoice.id}
          status={invoice.status}
          balanceDue={invoice.balanceDue.toString()}
          currency={invoice.currency}
          accountEmail={accountEmail}
        />
      </div>

      <Separator />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Customer & dates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">
                {t("table.account")}
              </span>
              <span className="font-medium">
                {invoice.account?.name ?? "-"}
              </span>
            </div>
            {billing.street && (
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Address</span>
                <span>
                  {billing.street}
                  {billing.city ? `, ${billing.city}` : ""}
                  {billing.postalCode ? ` ${billing.postalCode}` : ""}
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">
                {t("table.issueDate")}
              </span>
              <span>{formatDate(invoice.issueDate)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">
                {t("table.dueDate")}
              </span>
              <span>{formatDate(invoice.dueDate)}</span>
            </div>
            {invoice.variableSymbol && (
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">
                  {t("form.variableSymbol")}
                </span>
                <span>{invoice.variableSymbol}</span>
              </div>
            )}
            {invoice.series && (
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">
                  {t("form.series")}
                </span>
                <span>{invoice.series.name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Totals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">
                {formatCurrency(
                  invoice.subtotal.toString(),
                  invoice.currency
                )}
              </span>
            </div>
            {parseFloat(invoice.discountTotal.toString()) > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-mono text-red-600">
                  -
                  {formatCurrency(
                    invoice.discountTotal.toString(),
                    invoice.currency
                  )}
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">VAT</span>
              <span className="font-mono">
                {formatCurrency(
                  invoice.vatTotal.toString(),
                  invoice.currency
                )}
              </span>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-2 font-semibold">
              <span>Grand Total</span>
              <span className="font-mono">
                {formatCurrency(
                  invoice.grandTotal.toString(),
                  invoice.currency
                )}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Paid</span>
              <span className="font-mono text-green-600">
                {formatCurrency(
                  invoice.paidTotal.toString(),
                  invoice.currency
                )}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-semibold">
              <span>Balance Due</span>
              <span className="font-mono">
                {formatCurrency(
                  invoice.balanceDue.toString(),
                  invoice.currency
                )}
              </span>
            </div>
            {invoice.bankName && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">Bank</span>
                  <span>{invoice.bankName}</span>
                </div>
                {invoice.iban && (
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">IBAN</span>
                    <span className="font-mono text-xs">{invoice.iban}</span>
                  </div>
                )}
                {invoice.swift && (
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">SWIFT</span>
                    <span className="font-mono text-xs">
                      {invoice.swift}
                    </span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("form.lineItems")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>{t("form.description")}</TableHead>
                <TableHead className="text-right">
                  {t("form.quantity")}
                </TableHead>
                <TableHead className="text-right">
                  {t("form.unitPrice")}
                </TableHead>
                <TableHead className="text-right">
                  {t("form.discount")}
                </TableHead>
                <TableHead className="text-right">
                  {t("form.taxRate")}
                </TableHead>
                <TableHead className="text-right">
                  {t("form.total")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lineItems.map((li, idx) => (
                <TableRow key={li.id}>
                  <TableCell className="text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{li.description}</span>
                      {li.product && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({li.product.name})
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {li.quantity.toString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(
                      li.unitPrice.toString(),
                      invoice.currency
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {parseFloat(li.discountPercent.toString()) > 0
                      ? `${li.discountPercent}%`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {li.taxRate
                      ? `${li.taxRate.name} (${li.taxRate.rate}%)`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(
                      li.lineTotal.toString(),
                      invoice.currency
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      {(invoice.publicNotes || invoice.internalNotes) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {invoice.publicNotes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t("form.publicNotes")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {invoice.publicNotes}
                </p>
              </CardContent>
            </Card>
          )}
          {invoice.internalNotes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t("form.internalNotes")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {invoice.internalNotes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Payments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentList
            payments={JSON.parse(JSON.stringify(invoice.payments))}
            currency={invoice.currency}
          />
        </CardContent>
      </Card>

      {/* Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityLog
            activities={JSON.parse(JSON.stringify(invoice.activity))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
