import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { ChartDataPoint } from "./types";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica" },
  header: { marginBottom: 20 },
  title: { fontSize: 18, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#666" },
  table: { marginTop: 16 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ccc", paddingBottom: 6, marginBottom: 4 },
  tableRow: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  cellName: { flex: 2, fontSize: 10 },
  cellValue: { flex: 1, fontSize: 10, textAlign: "right" },
  headerText: { fontSize: 10, fontFamily: "Helvetica-Bold" },
});

type ReportPDFProps = { title: string; dateRange: string; data: ChartDataPoint[]; headers: [string, string] };

function ReportPDF({ title, dateRange, data, headers }: ReportPDFProps) {
  return React.createElement(Document, null,
    React.createElement(Page, { size: "A4", style: styles.page },
      React.createElement(View, { style: styles.header },
        React.createElement(Text, { style: styles.title }, title),
        React.createElement(Text, { style: styles.subtitle }, dateRange)
      ),
      React.createElement(View, { style: styles.table },
        React.createElement(View, { style: styles.tableHeader },
          React.createElement(Text, { style: { ...styles.cellName, ...styles.headerText } }, headers[0]),
          React.createElement(Text, { style: { ...styles.cellValue, ...styles.headerText } }, headers[1])
        ),
        ...data.map((row, i) =>
          React.createElement(View, { key: i, style: styles.tableRow },
            React.createElement(Text, { style: styles.cellName }, row.name),
            React.createElement(Text, { style: styles.cellValue }, String(row.Number))
          )
        )
      )
    )
  );
}

export async function generatePDF(title: string, dateRange: string, data: ChartDataPoint[], headers: [string, string]): Promise<Buffer> {
  const doc = React.createElement(ReportPDF, { title, dateRange, data, headers });
  return renderToBuffer(doc);
}
