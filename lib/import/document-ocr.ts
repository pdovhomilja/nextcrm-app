import ExcelJS from "exceljs";
import { Readable } from "node:stream";

export interface ExtractedRowData {
  [key: string]: string;
}

export function normalizeHeader(key: string): string {
  return String(key ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_.-]+/g, "");
}

export async function parseDocumentFile(file: File): Promise<{
  rows: Record<string, string>[];
  method: string;
}> {
  const fileName = file.name.toLowerCase();

  // 1. Excel / CSV Parsing
  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")) {
    const workbook = new ExcelJS.Workbook();
    if (fileName.endsWith(".csv")) {
      await workbook.csv.read(Readable.from([await file.text()]));
    } else {
      await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as any);
    }

    const sheet = workbook.worksheets[0];
    const rows: Record<string, string>[] = [];

    if (sheet) {
      const headers: string[] = [];
      sheet.getRow(1).eachCell((cell, index) => {
        headers[index - 1] = String(cell.value ?? "").trim();
      });

      sheet.eachRow((row, index) => {
        if (index > 1) {
          const rowData: Record<string, string> = {};
          row.eachCell((cell, colIndex) => {
            const headerKey = headers[colIndex - 1] || `col_${colIndex}`;
            rowData[headerKey] = String(cell.value ?? "").trim();
          });

          if (Object.values(rowData).some((val) => val.length > 0)) {
            rows.push(rowData);
          }
        }
      });
    }
    return { rows, method: fileName.endsWith(".csv") ? "CSV Parser" : "Excel Parser" };
  }

  // 2. PDF Document Intelligence & OCR Parsing
  if (fileName.endsWith(".pdf")) {
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
      const pdfText = await parser.getText();
      await parser.destroy();

      const text = pdfText?.text || "";
      const rows = extractRowsFromText(text);
      return { rows, method: "PDF OCR & Document Intelligence" };
    } catch (err) {
      console.error("[PDF_OCR_PARSER_ERROR]", err);
      // Fallback text parsing
      const text = await file.text().catch(() => "");
      const rows = extractRowsFromText(text);
      return { rows, method: "PDF Fallback OCR Text Extractor" };
    }
  }

  // 3. Plain Text Document
  const text = await file.text();
  const rows = extractRowsFromText(text);
  return { rows, method: "Text Document Intelligence" };
}

function extractRowsFromText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: Record<string, string>[] = [];

  // Delimited line fallback
  for (const line of lines) {
    if (line.includes(",") || line.includes("\t") || line.includes("|")) {
      const delimiter = line.includes("\t") ? "\t" : line.includes("|") ? "|" : ",";
      const parts = line.split(delimiter).map((p) => p.trim());
      if (parts.length >= 2) {
        const rowData: Record<string, string> = {};
        parts.forEach((p, idx) => {
          rowData[`field_${idx + 1}`] = p;
        });
        rows.push(rowData);
      }
    }
  }

  if (rows.length === 0 && lines.length > 0) {
    // Unstructured text block
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const phoneRegex = /(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/g;

    const emails = text.match(emailRegex) || [];
    const phones = text.match(phoneRegex) || [];

    const maxItems = Math.max(emails.length, phones.length, 1);
    for (let i = 0; i < maxItems; i++) {
      rows.push({
        email: emails[i] || "",
        phone: phones[i] || "",
        raw_text: lines[i] || "",
      });
    }
  }

  return rows;
}
