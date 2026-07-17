import ExcelJS from "exceljs";
import { parseSpreadsheetFile } from "@/lib/spreadsheet/parse";

describe("parseSpreadsheetFile", () => {
  it("parses CSV files via header row", async () => {
    const file = new File(
      ["email,last_name\njane@acme.com,Doe\n,\njohn@acme.com,Roe"],
      "targets.csv",
      { type: "text/csv" }
    );
    const rows = await parseSpreadsheetFile(file);
    expect(rows).toEqual([
      { email: "jane@acme.com", last_name: "Doe" },
      { email: "john@acme.com", last_name: "Roe" },
    ]);
  });

  it("parses XLSX files via first-row headers", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Sheet1");
    ws.addRow(["email", "last_name"]);
    ws.addRow(["jane@acme.com", "Doe"]);
    ws.addRow([]); // empty row must be dropped
    ws.addRow(["john@acme.com", "Roe"]);
    const buffer = await wb.xlsx.writeBuffer();
    const file = new File([buffer], "targets.xlsx");

    const rows = await parseSpreadsheetFile(file);
    expect(rows).toEqual([
      { email: "jane@acme.com", last_name: "Doe" },
      { email: "john@acme.com", last_name: "Roe" },
    ]);
  });

  it("returns [] for an xlsx workbook with no worksheet", async () => {
    const wb = new ExcelJS.Workbook();
    const buffer = await wb.xlsx.writeBuffer();
    const file = new File([buffer], "empty.xlsx");
    expect(await parseSpreadsheetFile(file)).toEqual([]);
  });
});
