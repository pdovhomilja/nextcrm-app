"use client";

import { useState, useRef, startTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Trash2,
  FileCheck,
} from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const PRODUCTS_CSV_TEMPLATE = `name,sku,type,category,description,unit_price,unit_cost,currency,tax_rate,unit
"Cloud Hosting Basic","SKU-001","SERVICE","Software","Basic cloud hosting plan",99.00,45.00,"USD",20,"per month"
"Ergonomic Office Chair","SKU-002","PRODUCT","Hardware","Ergonomic desk chair",299.00,150.00,"USD",20,"per unit"`;

interface ExtractedProduct {
  name: string;
  sku?: string;
  type?: string;
  category?: string;
  description?: string;
  unit_price?: string;
  unit_cost?: string;
  currency?: string;
  tax_rate?: string;
  unit?: string;
}

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

export function ImportProductsDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [extractedProducts, setExtractedProducts] = useState<ExtractedProduct[]>([]);
  const [extractionMethod, setExtractionMethod] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setExtractedProducts([]);
    setExtractionMethod("");
    setResult(null);
    setIsImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    setOpen(false);
  };

  const downloadTemplate = () => {
    const blob = new Blob([PRODUCTS_CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);

    const formData = new FormData();
    formData.append("file", selected);

    try {
      const res = await fetch("/api/crm/products/bulk-import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Failed to parse file");
        return;
      }

      setExtractionMethod(data.extractionMethod || "OCR & Document Intelligence");
      setExtractedProducts(data.products || []);
      toast.success(`Extracted ${data.products?.length || 0} product(s) from ${selected.name}`);
    } catch (err: any) {
      toast.error(err.message || "An error occurred while reading file");
    }
  };

  const handleProductChange = (index: number, field: keyof ExtractedProduct, value: string) => {
    setExtractedProducts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveProduct = (index: number) => {
    setExtractedProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmImport = async () => {
    if (extractedProducts.length === 0) {
      toast.error("No valid products to import");
      return;
    }

    setIsImporting(true);
    try {
      const res = await fetch("/api/crm/products/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: extractedProducts }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setResult({ imported: 0, skipped: 0, errors: [data.error || "Failed to import products"] });
        return;
      }

      setResult({
        imported: data.importedCount || extractedProducts.length,
        skipped: 0,
        errors: data.errors || [],
      });
      toast.success(`Successfully imported ${data.importedCount || extractedProducts.length} product(s)!`);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      setResult({ imported: 0, skipped: 0, errors: [err.message || "Error saving products"] });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Products from CSV, Excel, PDF (OCR)</DialogTitle>
          <DialogDescription>
            Upload product spreadsheets, documents, or scanned PDFs. Download the template to see the expected format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV Template
            </Button>
            {file && extractionMethod && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileCheck className="h-4 w-4 text-green-600" />
                <span>Method: </span>
                <Badge variant="outline">{extractionMethod}</Badge>
              </div>
            )}
          </div>

          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,.pdf,.txt"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          {/* Editable Preview Table */}
          {extractedProducts.length > 0 && !result && (
            <div className="rounded-md border overflow-x-auto max-h-[360px]">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs min-w-[150px]">Product Name *</TableHead>
                    <TableHead className="text-xs min-w-[100px]">SKU</TableHead>
                    <TableHead className="text-xs min-w-[100px]">Type</TableHead>
                    <TableHead className="text-xs min-w-[100px]">Unit Price</TableHead>
                    <TableHead className="text-xs min-w-[100px]">Unit Cost</TableHead>
                    <TableHead className="text-xs min-w-[80px]">Currency</TableHead>
                    <TableHead className="text-xs min-w-[100px]">Unit</TableHead>
                    <TableHead className="text-xs w-[50px] text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractedProducts.map((product, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="p-1">
                        <Input
                          value={product.name || ""}
                          onChange={(e) => handleProductChange(idx, "name", e.target.value)}
                          className="h-7 text-xs font-medium"
                          placeholder="Product Name"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={product.sku || ""}
                          onChange={(e) => handleProductChange(idx, "sku", e.target.value)}
                          className="h-7 text-xs"
                          placeholder="SKU-123"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={product.type || ""}
                          onChange={(e) => handleProductChange(idx, "type", e.target.value)}
                          className="h-7 text-xs uppercase"
                          placeholder="PRODUCT"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={product.unit_price || ""}
                          onChange={(e) => handleProductChange(idx, "unit_price", e.target.value)}
                          className="h-7 text-xs"
                          placeholder="99.00"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={product.unit_cost || ""}
                          onChange={(e) => handleProductChange(idx, "unit_cost", e.target.value)}
                          className="h-7 text-xs"
                          placeholder="45.00"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={product.currency || ""}
                          onChange={(e) => handleProductChange(idx, "currency", e.target.value)}
                          className="h-7 text-xs uppercase"
                          placeholder="USD"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={product.unit || ""}
                          onChange={(e) => handleProductChange(idx, "unit", e.target.value)}
                          className="h-7 text-xs"
                          placeholder="per unit"
                        />
                      </TableCell>
                      <TableCell className="p-1 text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveProduct(idx)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Confirm Import Button */}
          {extractedProducts.length > 0 && !result && (
            <Button onClick={handleConfirmImport} disabled={isImporting}>
              {isImporting ? "Importing..." : `Confirm Import (${extractedProducts.length} products)`}
            </Button>
          )}

          {/* Result Display */}
          {result && (
            <div className="space-y-3 pt-2">
              {result.imported > 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {result.imported} product(s) imported successfully!
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
                  <div className="max-h-40 overflow-y-auto rounded-md border bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/20 dark:text-red-400">
                    {result.errors.map((err, i) => (
                      <p key={i}>{err}</p>
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
