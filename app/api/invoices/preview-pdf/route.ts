import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { Decimal } from "decimal.js";
import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, accountReadScopeWhere } from "@/lib/authz";
import { computeInvoiceTotals, computeLineTotal } from "@/lib/invoices/totals";
import { renderInvoicePdf } from "@/lib/invoices/pdf/render";
import { VENSAI_BRAND } from "@/lib/brand/vensai";
import { PDFParse } from "pdf-parse";
import type {
  InvoicePdfData,
  PdfParty,
  PdfLineItem,
} from "@/lib/invoices/pdf/templates/default-invoice";

export const dynamic = "force-dynamic";

let cachedLogoBase64: string | null = null;
function getLogoDataUri(): string | undefined {
  if (cachedLogoBase64 !== null) return cachedLogoBase64;
  try {
    const logoPath = path.join(process.cwd(), "public", "images", "vensai-labs-logo.jpg");
    if (fs.existsSync(logoPath)) {
      const buffer = fs.readFileSync(logoPath);
      cachedLogoBase64 = `data:image/jpeg;base64,${buffer.toString("base64")}`;
      return cachedLogoBase64;
    }
  } catch (e) {
    console.warn("[preview-pdf] Could not read logo file:", e);
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user with permission scoping
    let user;
    try {
      user = await requireAuthenticated();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const {
      type = "INVOICE",
      number,
      issueDate = new Date().toISOString().slice(0, 10),
      dueDate,
      taxableSupplyDate,
      currency = "CZK",
      accountId,
      seriesId,
      bankName,
      iban,
      swift,
      variableSymbol,
      publicNotes,
      locale = (user as any).userLanguage ?? "en",
      lineItems = [],
    } = body;

    // Fetch settings and tax rates in parallel, with strict accountReadScopeWhere authorization
    const [settings, taxRates, account, series] = await Promise.all([
      prismadb.invoice_Settings.findFirst(),
      prismadb.invoice_TaxRates.findMany(),
      accountId
        ? prismadb.crm_Accounts.findFirst({
            where: {
              id: accountId,
              ...accountReadScopeWhere(user),
            },
            select: {
              name: true,
              billing_street: true,
              billing_city: true,
              billing_postal_code: true,
              billing_country: true,
              vat: true,
              company_id: true,
            },
          })
        : null,
      seriesId
        ? prismadb.invoice_Series.findUnique({
            where: { id: seriesId },
            select: { name: true, prefixTemplate: true, counter: true },
          })
        : null,
    ]);

    // Build Supplier details with VenSai branding fallback
    const supplier: PdfParty = {
      name: settings?.companyName || VENSAI_BRAND.companyName,
      street: settings?.companyAddress ?? undefined,
      city: settings?.companyCity ?? undefined,
      zip: settings?.companyZip ?? undefined,
      country: settings?.companyCountry ?? undefined,
      vatId: settings?.companyVatId ?? undefined,
      regId: settings?.companyRegNo ?? undefined,
    };

    // Build Customer details
    const customer: PdfParty = {
      name: account?.name || "(Customer / Account not selected)",
      street: account?.billing_street ?? undefined,
      city: account?.billing_city ?? undefined,
      zip: account?.billing_postal_code ?? undefined,
      country: account?.billing_country ?? undefined,
      vatId: account?.vat ?? undefined,
      regId: account?.company_id ?? undefined,
    };

    // Tax rate map
    const taxRateMap = new Map<string, number>();
    taxRates.forEach((tr) => {
      taxRateMap.set(tr.id, Number(tr.rate));
    });

    // Compute line totals
    const preparedLines: PdfLineItem[] = [];
    const linesForTotals = (lineItems as any[]).map((li, index) => {
      const qty = new Decimal(String(li.quantity || 0));
      const price = new Decimal(String(li.unitPrice || 0));
      const disc = new Decimal(String(li.discountPercent || 0));
      
      let rateNum = 0;
      if (li.taxRate !== undefined && li.taxRate !== null && !isNaN(Number(li.taxRate))) {
        rateNum = Number(li.taxRate);
      } else if (li.taxRateId && taxRateMap.has(li.taxRateId)) {
        rateNum = taxRateMap.get(li.taxRateId) || 0;
      }
      const rate = new Decimal(rateNum);

      const computed = computeLineTotal({
        quantity: qty,
        unitPrice: price,
        discountPercent: disc,
        taxRate: rate,
      });

      preparedLines.push({
        position: index + 1,
        description: li.description || `Line item ${index + 1}`,
        quantity: qty.toFixed(2),
        unitPrice: price.toFixed(2),
        discountPercent: disc.toFixed(0),
        taxRate: rate.toFixed(0),
        lineTotal: computed.lineTotal.toFixed(2),
      });

      return {
        quantity: qty,
        unitPrice: price,
        discountPercent: disc,
        taxRate: rate,
      };
    });

    const totals = computeInvoiceTotals(linesForTotals);

    // Document number
    let displayInvoiceNumber = number;
    if (!displayInvoiceNumber) {
      if (series) {
        displayInvoiceNumber = `${series.prefixTemplate || ""}${series.counter + 1} (Draft)`;
      } else {
        displayInvoiceNumber = "DRAFT";
      }
    }

    const pdfData: InvoicePdfData = {
      type: type as InvoicePdfData["type"],
      number: displayInvoiceNumber,
      issueDate: issueDate || new Date().toISOString().slice(0, 10),
      dueDate: dueDate || undefined,
      taxableSupplyDate: taxableSupplyDate || undefined,
      locale,
      currency,
      supplier,
      customer,
      lineItems: preparedLines,
      subtotal: totals.subtotal.toFixed(2),
      vatTotal: totals.vatTotal.toFixed(2),
      grandTotal: totals.grandTotal.toFixed(2),
      vatBreakdown: totals.vatBreakdown,
      payment: {
        bankName: bankName || settings?.bankName || undefined,
        iban: iban || settings?.iban || undefined,
        swift: swift || settings?.swift || undefined,
        variableSymbol: variableSymbol || undefined,
      },
      publicNotes: publicNotes || undefined,
      logoUrl: getLogoDataUri(),
      companyTagline: VENSAI_BRAND.servicesLine,
    };

    const pdfBuffer = await renderInvoicePdf(pdfData);

    const isDownload = req.nextUrl.searchParams.get("download") === "1";
    const wantsPdf =
      isDownload ||
      req.nextUrl.searchParams.get("format") === "pdf" ||
      req.headers.get("accept") === "application/pdf";
    const filename = `Invoice-${displayInvoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

    if (wantsPdf) {
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${filename}"`,
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Content-Length": String(pdfBuffer.length),
        },
      });
    }

    // Process pages for live interactive preview
    let totalPages = 1;
    let pages: string[] = [];
    try {
      const parser = new PDFParse({ data: pdfBuffer });
      const screenshotResult = await parser.getScreenshot({
        scale: 1.5,
        imageDataUrl: true,
      });
      totalPages = screenshotResult?.total ?? 1;
      pages = (screenshotResult?.pages || []).map((p: any) => p.dataUrl);
      await parser.destroy();
    } catch (parseErr) {
      console.warn("[preview-pdf] Screenshot generation warning:", parseErr);
    }

    return NextResponse.json({
      success: true,
      totalPages: Math.max(1, totalPages),
      pages,
      pdfBase64: Buffer.from(pdfBuffer).toString("base64"),
      filename,
    });
  } catch (error) {
    console.error("[preview-pdf] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate PDF preview" },
      { status: 500 }
    );
  }
}
