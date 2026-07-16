import Papa from "papaparse";

// Parses a CSV or XLSX File into header-keyed string records.
// Works in both the server action and the browser (exceljs is
// loaded lazily so it never lands in the main client bundle).
export async function parseSpreadsheetFile(
  file: File
): Promise<Record<string, string>[]> {
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];

    const headers: string[] = [];
    sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col - 1] = String(cell.value ?? "").trim();
    });

    const rows: Record<string, string>[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const record: Record<string, string> = {};
      let hasValue = false;
      headers.forEach((header, i) => {
        if (!header) return;
        const cell = row.getCell(i + 1);
        const value = cell.value == null ? "" : String(cell.text).trim();
        record[header] = value;
        if (value) hasValue = true;
      });
      if (hasValue) rows.push(record);
    });
    return rows;
  }

  const text = await file.text();
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
  });
  return data;
}
