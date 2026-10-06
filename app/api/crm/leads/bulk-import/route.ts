import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

export const runtime = "nodejs";

interface ExtractedLead {
  id?: string;
  first_name?: string;
  last_name: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  description?: string;
  source?: string;
  confidence?: "High" | "Medium" | "Low";
}

function normalizeHeader(key: string): string {
  return String(key ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_.-]+/g, "");
}

function mapRowToLead(row: Record<string, unknown>): ExtractedLead {
  const normalizedMap = new Map(
    Object.entries(row).map(([k, v]) => [normalizeHeader(k), String(v ?? "").trim()])
  );

  const firstName =
    normalizedMap.get("firstname") ||
    normalizedMap.get("first") ||
    normalizedMap.get("givenname") ||
    "";

  let lastName =
    normalizedMap.get("lastname") ||
    normalizedMap.get("last") ||
    normalizedMap.get("surname") ||
    normalizedMap.get("familyname") ||
    "";

  let fullName = normalizedMap.get("name") || normalizedMap.get("fullname") || "";

  if (!lastName && fullName) {
    const parts = fullName.split(/\s+/);
    if (parts.length > 1) {
      lastName = parts.pop() || "Lead";
    } else {
      lastName = parts[0] || "Lead";
    }
  }

  if (!lastName && !firstName) {
    lastName = "Unknown Lead";
  }

  const company =
    normalizedMap.get("company") ||
    normalizedMap.get("organization") ||
    normalizedMap.get("companyname") ||
    normalizedMap.get("business") ||
    "";

  const jobTitle =
    normalizedMap.get("jobtitle") ||
    normalizedMap.get("title") ||
    normalizedMap.get("position") ||
    normalizedMap.get("role") ||
    "";

  const email =
    normalizedMap.get("email") ||
    normalizedMap.get("emailaddress") ||
    normalizedMap.get("mail") ||
    "";

  const phone =
    normalizedMap.get("phone") ||
    normalizedMap.get("phonenumber") ||
    normalizedMap.get("mobile") ||
    normalizedMap.get("telephone") ||
    "";

  const description =
    normalizedMap.get("description") ||
    normalizedMap.get("notes") ||
    normalizedMap.get("comment") ||
    normalizedMap.get("about") ||
    "";

  return {
    first_name: firstName,
    last_name: lastName || "Lead",
    company,
    jobTitle,
    email,
    phone,
    description,
    confidence: "High",
  };
}

function extractLeadsFromPlainText(text: string): ExtractedLead[] {
  const leads: ExtractedLead[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const phoneRegex = /(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/g;

  // Pattern 1: CSV / tab separated line fallback
  for (const line of lines) {
    if (line.includes(",") || line.includes("\t") || line.includes("|")) {
      const delimiter = line.includes("\t") ? "\t" : line.includes("|") ? "|" : ",";
      const parts = line.split(delimiter).map((p) => p.trim());
      if (parts.length >= 2) {
        const foundEmail = parts.find((p) => emailRegex.test(p));
        const foundPhone = parts.find((p) => phoneRegex.test(p) && p.replace(/\D/g, "").length >= 7);
        const namePart = parts.find((p) => p !== foundEmail && p !== foundPhone && p.length > 1);

        if (foundEmail || foundPhone || namePart) {
          const nameTokens = (namePart || "Lead Contact").split(/\s+/);
          const firstName = nameTokens.length > 1 ? nameTokens.slice(0, -1).join(" ") : "";
          const lastName = nameTokens.length > 1 ? nameTokens[nameTokens.length - 1] : nameTokens[0] || "Lead";

          leads.push({
            first_name: firstName,
            last_name: lastName,
            email: foundEmail || "",
            phone: foundPhone || "",
            company: parts.length > 3 ? parts[2] : "",
            jobTitle: parts.length > 4 ? parts[3] : "",
            confidence: "Medium",
          });
        }
      }
    }
  }

  // Pattern 2: Business card / unstructured block parsing
  if (leads.length === 0) {
    const emails = text.match(emailRegex) || [];
    const uniqueEmails = Array.from(new Set(emails));

    for (const email of uniqueEmails) {
      const emailUsername = email.split("@")[0] || "lead";
      const parts = emailUsername.split(/[._-]/);
      const firstName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : "";
      const lastName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : "Lead";
      const domain = email.split("@")[1]?.split(".")[0] || "";
      const company = domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : "";

      leads.push({
        first_name: firstName,
        last_name: lastName,
        email,
        company,
        confidence: "Medium",
      });
    }
  }

  return leads;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  // Action: Save / Bulk Insert Leads
  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      const { leads, lead_source_id, lead_status_id, lead_type_id } = body;

      if (!Array.isArray(leads) || leads.length === 0) {
        return NextResponse.json({ error: "No leads provided to import" }, { status: 400 });
      }

      let importedCount = 0;
      const errors: string[] = [];

      for (const lead of leads) {
        if (!lead.last_name && !lead.first_name) continue;

        try {
          await prismadb.crm_Leads.create({
            data: {
              v: 1,
              createdBy: session.user.id,
              updatedBy: session.user.id,
              firstName: lead.first_name || undefined,
              lastName: lead.last_name || "Lead",
              company: lead.company || undefined,
              jobTitle: lead.jobTitle || undefined,
              email: lead.email || undefined,
              phone: lead.phone || undefined,
              description: lead.description || undefined,
              lead_source_id: lead_source_id || undefined,
              lead_status_id: lead_status_id || undefined,
              lead_type_id: lead_type_id || undefined,
              assigned_to: session.user.id,
            },
          });
          importedCount++;
        } catch (err: any) {
          errors.push(`Failed lead ${lead.first_name || ""} ${lead.last_name}: ${err.message}`);
        }
      }

      return NextResponse.json({
        success: true,
        importedCount,
        skippedCount: leads.length - importedCount,
        errors,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Failed to process bulk import" }, { status: 500 });
    }
  }

  // Action: Parse Document / Spreadsheet File
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 15 MB limit" }, { status: 413 });
    }

    const fileName = file.name.toLowerCase();
    const extractedLeads: ExtractedLead[] = [];
    let method = "Spreadsheet Parser";

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")) {
      const workbook = new ExcelJS.Workbook();
      if (fileName.endsWith(".csv")) {
        await workbook.csv.read(Readable.from([await file.text()]));
      } else {
        await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as any);
      }

      const sheet = workbook.worksheets[0];
      if (sheet) {
        const headers: string[] = [];
        sheet.getRow(1).eachCell((cell, index) => {
          headers[index - 1] = String(cell.value ?? "").trim();
        });

        sheet.eachRow((row, index) => {
          if (index > 1) {
            const rowData: Record<string, unknown> = {};
            row.eachCell((cell, colIndex) => {
              const headerKey = headers[colIndex - 1] || `col_${colIndex}`;
              rowData[headerKey] = cell.value;
            });

            if (Object.values(rowData).some(Boolean)) {
              const lead = mapRowToLead(rowData);
              if (lead.last_name || lead.first_name || lead.email || lead.phone) {
                extractedLeads.push(lead);
              }
            }
          }
        });
      }
    } else if (fileName.endsWith(".pdf")) {
      method = "OCR & Document Intelligence";
      try {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
        const pdfText = await parser.getText();
        await parser.destroy();

        if (pdfText?.text) {
          const parsedLeads = extractLeadsFromPlainText(pdfText.text);
          extractedLeads.push(...parsedLeads);
        }
      } catch (pdfErr) {
        console.error("PDF OCR error:", pdfErr);
      }
    } else {
      // Plain text or fallback document
      method = "Document Text Extractor";
      const text = await file.text();
      const parsedLeads = extractLeadsFromPlainText(text);
      extractedLeads.push(...parsedLeads);
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      extractionMethod: method,
      totalDetected: extractedLeads.length,
      leads: extractedLeads,
    });
  } catch (err: any) {
    console.error("[BULK_IMPORT_PARSE_ERROR]", err);
    return NextResponse.json({ error: err.message || "Failed to parse file" }, { status: 500 });
  }
}
