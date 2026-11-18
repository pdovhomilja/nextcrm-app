export interface PdfStrings {
  invoice: string;
  creditNote: string;
  proforma: string;
  issueDate: string;
  dueDate: string;
  taxableSupplyDate: string;
  supplier: string;
  customer: string;
  vatId: string;
  regId: string;
  description: string;
  qty: string;
  unitPrice: string;
  discount: string;
  vat: string;
  lineTotal: string;
  subtotal: string;
  vatTotal: string;
  grandTotal: string;
  paymentInstructions: string;
  bank: string;
  iban: string;
  swift: string;
  variableSymbol: string;
  page: string;
  of: string;
}

const EN: PdfStrings = {
  invoice: "Invoice",
  creditNote: "Credit Note",
  proforma: "Proforma Invoice",
  issueDate: "Issue Date",
  dueDate: "Due Date",
  taxableSupplyDate: "Taxable Supply Date",
  supplier: "Supplier",
  customer: "Customer",
  vatId: "VAT ID",
  regId: "Reg. ID",
  description: "Description",
  qty: "Qty",
  unitPrice: "Unit Price",
  discount: "Discount",
  vat: "VAT",
  lineTotal: "Total",
  subtotal: "Subtotal",
  vatTotal: "VAT Total",
  grandTotal: "Grand Total",
  paymentInstructions: "Payment Instructions",
  bank: "Bank",
  iban: "IBAN",
  swift: "SWIFT",
  variableSymbol: "Variable Symbol",
  page: "Page",
  of: "of",
};

const CZ: PdfStrings = {
  invoice: "Faktura",
  creditNote: "Dobropis",
  proforma: "Proforma faktura",
  issueDate: "Datum vystaveni",
  dueDate: "Datum splatnosti",
  taxableSupplyDate: "Datum zdanitelneho plneni",
  supplier: "Dodavatel",
  customer: "Odberatel",
  vatId: "DIC",
  regId: "ICO",
  description: "Popis",
  qty: "Mnozstvi",
  unitPrice: "Cena za jednotku",
  discount: "Sleva",
  vat: "DPH",
  lineTotal: "Celkem",
  subtotal: "Mezisouce",
  vatTotal: "DPH celkem",
  grandTotal: "Celkem k uhrade",
  paymentInstructions: "Platebni udaje",
  bank: "Banka",
  iban: "IBAN",
  swift: "SWIFT",
  variableSymbol: "Variabilni symbol",
  page: "Strana",
  of: "z",
};

const PT_BR: PdfStrings = {
  invoice: "Fatura",
  creditNote: "Nota de crédito",
  proforma: "Fatura pro forma",
  issueDate: "Data de emissão",
  dueDate: "Data de vencimento",
  taxableSupplyDate: "Data da prestação tributável",
  supplier: "Fornecedor",
  customer: "Cliente",
  vatId: "CNPJ",
  regId: "Inscrição estadual",
  description: "Descrição",
  qty: "Qtd.",
  unitPrice: "Preço unitário",
  discount: "Desconto",
  vat: "Imposto",
  lineTotal: "Total",
  subtotal: "Subtotal",
  vatTotal: "Total de impostos",
  grandTotal: "Total geral",
  paymentInstructions: "Instruções de pagamento",
  bank: "Banco",
  iban: "IBAN",
  swift: "SWIFT",
  variableSymbol: "Código de referência",
  page: "Página",
  of: "de",
};

const bundles: Record<string, PdfStrings> = { en: EN, cs: CZ, "pt-BR": PT_BR };

export function getPdfStrings(locale: string): PdfStrings {
  return bundles[locale] ?? EN;
}
