import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { parseDocumentFile, normalizeHeader } from "@/lib/import/document-ocr";

export const runtime = "nodejs";

export interface ExtractedContract {
  id?: string;
  title: string;
  value?: string;
  currency?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  renewalReminderDate?: string;
  customerSignedDate?: string;
  companySignedDate?: string;
  description?: string;
  account?: string;
  assigned_to?: string;
}

function mapRowToContract(row: Record<string, string>): ExtractedContract {
  const normMap = new Map(
    Object.entries(row).map(([k, v]) => [normalizeHeader(k), String(v ?? "").trim()])
  );

  const title =
    normMap.get("title") ||
    normMap.get("contracttitle") ||
    normMap.get("name") ||
    normMap.get("contractname") ||
    normMap.get("subject") ||
    normMap.get("rawtext") ||
    "Contract Agreement";

  const value =
    normMap.get("value") ||
    normMap.get("amount") ||
    normMap.get("contractvalue") ||
    normMap.get("price") ||
    "0";

  const currency =
    normMap.get("currency") ||
    normMap.get("currencycode") ||
    "USD";

  const type =
    normMap.get("type") ||
    normMap.get("contracttype") ||
    normMap.get("category") ||
    "Service Agreement";

  const startDate =
    normMap.get("startdate") ||
    normMap.get("start") ||
    normMap.get("effectivefrom") ||
    "";

  const endDate =
    normMap.get("enddate") ||
    normMap.get("end") ||
    normMap.get("effectiveto") ||
    normMap.get("expirationdate") ||
    "";

  const renewalReminderDate =
    normMap.get("renewalreminderdate") ||
    normMap.get("renewaldate") ||
    normMap.get("reminderdate") ||
    "";

  const customerSignedDate =
    normMap.get("customersigneddate") ||
    normMap.get("customersigned") ||
    normMap.get("clientsigneddate") ||
    "";

  const companySignedDate =
    normMap.get("companysigneddate") ||
    normMap.get("companysigned") ||
    normMap.get("vendorsigneddate") ||
    "";

  const description =
    normMap.get("description") ||
    normMap.get("notes") ||
    normMap.get("details") ||
    "";

  const account =
    normMap.get("account") ||
    normMap.get("accountname") ||
    normMap.get("company") ||
    "";

  return {
    title,
    value,
    currency,
    type,
    startDate,
    endDate,
    renewalReminderDate,
    customerSignedDate,
    companySignedDate,
    description,
    account,
  };
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  // 1. Bulk Save Action
  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      const { contracts } = body;

      if (!Array.isArray(contracts) || contracts.length === 0) {
        return NextResponse.json({ error: "No contracts provided to import" }, { status: 400 });
      }

      let importedCount = 0;
      const errors: string[] = [];

      for (const item of contracts) {
        if (!item.title) continue;

        try {
          const numValue = parseFloat(item.value || "0");
          const sDate = item.startDate ? new Date(item.startDate) : null;
          const eDate = item.endDate ? new Date(item.endDate) : null;
          const rDate = item.renewalReminderDate ? new Date(item.renewalReminderDate) : null;
          const custDate = item.customerSignedDate ? new Date(item.customerSignedDate) : null;
          const compDate = item.companySignedDate ? new Date(item.companySignedDate) : null;

          await prismadb.crm_Contracts.create({
            data: {
              v: 0,
              title: item.title,
              value: isNaN(numValue) ? 0 : numValue,
              currency: item.currency || "USD",
              type: item.type || undefined,
              startDate: sDate && !isNaN(sDate.getTime()) ? sDate : undefined,
              endDate: eDate && !isNaN(eDate.getTime()) ? eDate : undefined,
              renewalReminderDate: rDate && !isNaN(rDate.getTime()) ? rDate : undefined,
              customerSignedDate: custDate && !isNaN(custDate.getTime()) ? custDate : undefined,
              companySignedDate: compDate && !isNaN(compDate.getTime()) ? compDate : undefined,
              description: item.description || undefined,
              createdBy: session.user.id,
              updatedBy: session.user.id,
              assigned_to: item.assigned_to || session.user.id,
            },
          });
          importedCount++;
        } catch (err: any) {
          errors.push(`Failed to import contract "${item.title}": ${err.message}`);
        }
      }

      return NextResponse.json({
        success: true,
        importedCount,
        skippedCount: contracts.length - importedCount,
        errors,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Failed to process contracts bulk import" }, { status: 500 });
    }
  }

  // 2. Document / Spreadsheet / PDF OCR File Parse Action
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const { rows, method } = await parseDocumentFile(file);
    const extractedContracts: ExtractedContract[] = rows.map((r) => mapRowToContract(r));

    return NextResponse.json({
      success: true,
      fileName: file.name,
      extractionMethod: method,
      totalDetected: extractedContracts.length,
      contracts: extractedContracts,
    });
  } catch (err: any) {
    console.error("[CONTRACTS_BULK_IMPORT_PARSE_ERROR]", err);
    return NextResponse.json({ error: err.message || "Failed to parse contract file" }, { status: 500 });
  }
}
