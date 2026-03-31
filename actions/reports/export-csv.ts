import type { ChartDataPoint } from "./types";

function escapeCSV(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCSV(data: ChartDataPoint[], headers: string[]): string {
  const headerRow = headers.join(",");
  if (data.length === 0) return headerRow;
  const rows = data.map((row) => [escapeCSV(row.name), escapeCSV(row.Number)].join(","));
  return [headerRow, ...rows].join("\n");
}
