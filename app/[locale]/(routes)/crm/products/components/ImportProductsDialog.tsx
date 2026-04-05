"use client";

import { useState, useRef } from "react";
import { Upload, Download, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { importProducts } from "@/actions/crm/products/import-products";

const CSV_TEMPLATE = `name,sku,type,category,description,unit_price,unit_cost,currency,tax_rate,unit,is_recurring,billing_period
"Cloud Hosting Basic","SKU-001","SERVICE","Software","Basic cloud hosting plan",99.00,45.00,"USD",20,"per month",true,MONTHLY
"Office Chair","SKU-002","PRODUCT","Hardware","Ergonomic office chair",299.00,150.00,"USD",20,"per unit",false,`;

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

export function ImportProductsDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPreview([]);
    setHeaders([]);
    setResult(null);
    setIsImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    setOpen(false);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim().length > 0);
      if (lines.length === 0) return;

      // Parse CSV headers
      const headerLine = parseCsvLine(lines[0]);
      setHeaders(headerLine);

      // Parse first 5 data rows
      const rows: string[][] = [];
      for (let i = 1; i < Math.min(lines.length, 6); i++) {
        rows.push(parseCsvLine(lines[i]));
      }
      setPreview(rows);
    };
    reader.readAsText(selected);
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleImport = async () => {
    if (!file) return;
    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await importProducts(formData);
      setResult(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Import failed";
      setResult({ imported: 0, skipped: 0, errors: [message] });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Products from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import products. Download the template to
            see the expected format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template download */}
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download CSV Template
          </Button>

          {/* File input */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          {/* Preview table */}
          {preview.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h, i) => (
                      <TableHead key={i} className="whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, ri) => (
                    <TableRow key={ri}>
                      {row.map((cell, ci) => (
                        <TableCell key={ci} className="whitespace-nowrap">
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Showing first {preview.length} row(s) of preview
              </p>
            </div>
          )}

          {/* Import button */}
          {file && !result && (
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? "Importing..." : "Confirm Import"}
            </Button>
          )}

          {/* Result display */}
          {result && (
            <div className="space-y-3">
              {result.imported > 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {result.imported} product(s) imported successfully
                  </span>
                </div>
              )}
              {result.skipped > 0 && (
                <div className="flex items-center gap-2 text-yellow-600">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {result.skipped} row(s) skipped
                  </span>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      {result.errors.length} error(s)
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-md border bg-red-50 p-3 dark:bg-red-950/20">
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-700 dark:text-red-400">
                        {err}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <Button variant="outline" onClick={handleClose}>
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
