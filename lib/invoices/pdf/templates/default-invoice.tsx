import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { getPdfStrings, type PdfStrings } from "../i18n";

/* ------------------------------------------------------------------ */
/*  Data interfaces                                                    */
/* ------------------------------------------------------------------ */

export interface PdfParty {
  name: string;
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
  vatId?: string;
  regId?: string;
}

export interface PdfLineItem {
  position: number;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  taxRate: string;
  lineTotal: string;
}

export interface PdfVatBucket {
  rate: string;
  base: string;
  vat: string;
}

export interface PdfPaymentInfo {
  bankName?: string;
  iban?: string;
  swift?: string;
  variableSymbol?: string;
}

export interface InvoicePdfData {
  type: "INVOICE" | "CREDIT_NOTE" | "PROFORMA";
  number: string;
  issueDate: string;
  dueDate?: string;
  taxableSupplyDate?: string;
  locale: string;
  currency: string;

  supplier: PdfParty;
  customer: PdfParty;

  lineItems: PdfLineItem[];

  subtotal: string;
  vatTotal: string;
  grandTotal: string;
  vatBreakdown: PdfVatBucket[];

  payment?: PdfPaymentInfo;
  publicNotes?: string;
  logoUrl?: string;
  companyTagline?: string;
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const s = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 44,
    paddingHorizontal: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 14,
  },
  brandCol: {
    width: "55%",
  },
  logo: {
    width: 140,
    height: 42,
    objectFit: "contain",
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 2,
  },
  brandTagline: {
    fontSize: 8,
    color: "#64748b",
  },
  metaCol: {
    width: "42%",
    alignItems: "flex-end",
  },
  typeBadge: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  invoiceNumber: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0284c7",
    marginBottom: 6,
  },
  metaGrid: {
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 2,
  },
  metaLabel: {
    fontSize: 8,
    color: "#64748b",
    marginRight: 6,
  },
  metaValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },

  parties: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  partyBox: {
    width: "48%",
    padding: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  partyTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  partyName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 2,
  },
  partyLine: {
    fontSize: 8.5,
    color: "#334155",
    marginBottom: 1.5,
  },
  partyIdLine: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 2,
  },

  table: {
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 2,
    marginBottom: 2,
  },
  thText: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4.5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    minHeight: 18,
    alignItems: "center",
  },
  tableRowEven: {
    backgroundColor: "#fafafa",
  },
  tdText: {
    fontSize: 8.5,
    color: "#1e293b",
  },
  colPos: { width: "5%" },
  colDesc: { width: "35%" },
  colQty: { width: "10%", textAlign: "right" },
  colPrice: { width: "14%", textAlign: "right" },
  colDisc: { width: "10%", textAlign: "right" },
  colVat: { width: "10%", textAlign: "right" },
  colTotal: { width: "16%", textAlign: "right" },

  totalsBox: {
    alignSelf: "flex-end",
    width: "46%",
    marginTop: 8,
    padding: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  totalsLabel: {
    fontSize: 8.5,
    color: "#475569",
  },
  totalsValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textAlign: "right",
  },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderTopWidth: 1.5,
    borderTopColor: "#0f172a",
    marginTop: 4,
  },
  grandLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  grandValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textAlign: "right",
  },

  paymentBox: {
    marginTop: 12,
    padding: 9,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  paymentTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  paymentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  paymentItem: {
    marginRight: 16,
    marginBottom: 2,
  },
  paymentLabel: {
    fontSize: 7.5,
    color: "#64748b",
  },
  paymentVal: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },

  notes: {
    marginTop: 10,
    padding: 8,
    fontSize: 8,
    color: "#475569",
    backgroundColor: "#fcfcfc",
    borderRadius: 3,
    borderLeftWidth: 2,
    borderLeftColor: "#cbd5e1",
  },

  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerBrand: {
    fontSize: 7.5,
    color: "#94a3b8",
  },
  footerPage: {
    fontSize: 7.5,
    color: "#94a3b8",
  },
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function typeTitle(type: InvoicePdfData["type"], t: PdfStrings): string {
  switch (type) {
    case "CREDIT_NOTE":
      return t.creditNote;
    case "PROFORMA":
      return t.proforma;
    default:
      return t.invoice;
  }
}

function PartyBlock({ party, label }: { party: PdfParty; label: string }) {
  const hasDetails = party.street || party.city || party.zip || party.country;
  return (
    <View style={s.partyBox}>
      <Text style={s.partyTitle}>{label}</Text>
      <Text style={s.partyName}>{party.name || "-"}</Text>
      {party.street && <Text style={s.partyLine}>{party.street}</Text>}
      {(party.zip || party.city) && (
        <Text style={s.partyLine}>
          {[party.zip, party.city].filter(Boolean).join(" ")}
        </Text>
      )}
      {party.country && <Text style={s.partyLine}>{party.country}</Text>}

      {party.regId && <Text style={s.partyIdLine}>ID: {party.regId}</Text>}
      {party.vatId && <Text style={s.partyIdLine}>VAT: {party.vatId}</Text>}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Document                                                           */
/* ------------------------------------------------------------------ */

export function InvoicePdf({ data }: { data: InvoicePdfData }) {
  const t = getPdfStrings(data.locale);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.brandCol}>
            {data.logoUrl ? (
              /* eslint-disable-next-line jsx-a11y/alt-text */
              <Image src={data.logoUrl} style={s.logo} />
            ) : (
              <Text style={s.brandTitle}>{data.supplier.name || "VenSai Labs"}</Text>
            )}
            {data.companyTagline && (
              <Text style={s.brandTagline}>{data.companyTagline}</Text>
            )}
          </View>
          <View style={s.metaCol}>
            <Text style={s.typeBadge}>{typeTitle(data.type, t)}</Text>
            <Text style={s.invoiceNumber}>{data.number || "DRAFT"}</Text>
            <View style={s.metaGrid}>
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>{t.issueDate}:</Text>
                <Text style={s.metaValue}>{data.issueDate}</Text>
              </View>
              {data.dueDate && (
                <View style={s.metaRow}>
                  <Text style={s.metaLabel}>{t.dueDate}:</Text>
                  <Text style={s.metaValue}>{data.dueDate}</Text>
                </View>
              )}
              {data.taxableSupplyDate && (
                <View style={s.metaRow}>
                  <Text style={s.metaLabel}>{t.taxableSupplyDate}:</Text>
                  <Text style={s.metaValue}>{data.taxableSupplyDate}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Parties */}
        <View style={s.parties}>
          <PartyBlock party={data.supplier} label={t.supplier} />
          <PartyBlock party={data.customer} label={t.customer} />
        </View>

        {/* Line items table */}
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.colPos, s.thText]}>#</Text>
            <Text style={[s.colDesc, s.thText]}>{t.description}</Text>
            <Text style={[s.colQty, s.thText]}>{t.qty}</Text>
            <Text style={[s.colPrice, s.thText]}>{t.unitPrice}</Text>
            <Text style={[s.colDisc, s.thText]}>{t.discount}</Text>
            <Text style={[s.colVat, s.thText]}>{t.vat}</Text>
            <Text style={[s.colTotal, s.thText]}>{t.lineTotal}</Text>
          </View>
          {data.lineItems && data.lineItems.length > 0 ? (
            data.lineItems.map((li, index) => (
              <View
                style={[s.tableRow, index % 2 === 1 ? s.tableRowEven : {}]}
                key={li.position ?? index}
                wrap={false}
              >
                <Text style={[s.colPos, s.tdText]}>{li.position ?? index + 1}</Text>
                <Text style={[s.colDesc, s.tdText]}>{li.description || "-"}</Text>
                <Text style={[s.colQty, s.tdText]}>{li.quantity}</Text>
                <Text style={[s.colPrice, s.tdText]}>{li.unitPrice}</Text>
                <Text style={[s.colDisc, s.tdText]}>{li.discountPercent}%</Text>
                <Text style={[s.colVat, s.tdText]}>{li.taxRate}%</Text>
                <Text style={[s.colTotal, s.tdText]}>
                  {li.lineTotal} {data.currency}
                </Text>
              </View>
            ))
          ) : (
            <View style={s.tableRow}>
              <Text style={[s.colPos, s.tdText]}>1</Text>
              <Text style={[s.colDesc, s.tdText]}>-</Text>
              <Text style={[s.colQty, s.tdText]}>0</Text>
              <Text style={[s.colPrice, s.tdText]}>0.00</Text>
              <Text style={[s.colDisc, s.tdText]}>0%</Text>
              <Text style={[s.colVat, s.tdText]}>0%</Text>
              <Text style={[s.colTotal, s.tdText]}>0.00 {data.currency}</Text>
            </View>
          )}
        </View>

        {/* Totals */}
        <View style={s.totalsBox} wrap={false}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>{t.subtotal}</Text>
            <Text style={s.totalsValue}>
              {data.subtotal} {data.currency}
            </Text>
          </View>
          {data.vatBreakdown &&
            data.vatBreakdown.map((vb) => (
              <View style={s.totalsRow} key={vb.rate}>
                <Text style={s.totalsLabel}>
                  {t.vat} {vb.rate}%
                </Text>
                <Text style={s.totalsValue}>
                  {vb.vat} {data.currency}
                </Text>
              </View>
            ))}
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>{t.vatTotal}</Text>
            <Text style={s.totalsValue}>
              {data.vatTotal} {data.currency}
            </Text>
          </View>
          <View style={s.grandRow}>
            <Text style={s.grandLabel}>{t.grandTotal}</Text>
            <Text style={s.grandValue}>
              {data.grandTotal} {data.currency}
            </Text>
          </View>
        </View>

        {/* Payment info */}
        {data.payment &&
          (data.payment.bankName ||
            data.payment.iban ||
            data.payment.swift ||
            data.payment.variableSymbol) && (
            <View style={s.paymentBox} wrap={false}>
              <Text style={s.paymentTitle}>{t.paymentInstructions}</Text>
              <View style={s.paymentGrid}>
                {data.payment.bankName && (
                  <View style={s.paymentItem}>
                    <Text style={s.paymentLabel}>{t.bank}</Text>
                    <Text style={s.paymentVal}>{data.payment.bankName}</Text>
                  </View>
                )}
                {data.payment.iban && (
                  <View style={s.paymentItem}>
                    <Text style={s.paymentLabel}>{t.iban}</Text>
                    <Text style={s.paymentVal}>{data.payment.iban}</Text>
                  </View>
                )}
                {data.payment.swift && (
                  <View style={s.paymentItem}>
                    <Text style={s.paymentLabel}>{t.swift}</Text>
                    <Text style={s.paymentVal}>{data.payment.swift}</Text>
                  </View>
                )}
                {data.payment.variableSymbol && (
                  <View style={s.paymentItem}>
                    <Text style={s.paymentLabel}>{t.variableSymbol}</Text>
                    <Text style={s.paymentVal}>
                      {data.payment.variableSymbol}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

        {/* Notes */}
        {data.publicNotes ? (
          <View style={s.notes} wrap={false}>
            <Text>{data.publicNotes}</Text>
          </View>
        ) : null}

        {/* Footer with page numbers */}
        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>
            {data.supplier.name || "VenSai Labs"}
            {data.companyTagline ? ` | ${data.companyTagline}` : ""}
          </Text>
          <Text
            style={s.footerPage}
            render={({ pageNumber, totalPages }) =>
              `${t.page} ${pageNumber} ${t.of} ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

