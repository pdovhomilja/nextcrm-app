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

const CONTRACTS_CSV_TEMPLATE = `title,value,currency,type,startDate,endDate,renewalReminderDate,customerSignedDate,companySignedDate,description
"Master Services Agreement",15000,"USD","Service Agreement","2026-01-01","2027-01-01","2026-12-01","2025-12-28","2025-12-29","Annual software service contract"
"Equipment Supply Deal",8500,"USD","Supply Contract","2026-02-15","2026-08-15","2026-07-15","2026-02-10","2026-02-12","Hardware supply and maintenance terms"`;

interface ExtractedContract {
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
}

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

export function ImportContractsDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [extractedContracts, setExtractedContracts] = useState<ExtractedContract[]>([]);
  const [extractionMethod, setExtractionMethod] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setExtractedContracts([]);
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
    const blob = new Blob([CONTRACTS_CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contracts_import_template.csv";
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
      const res = await fetch("/api/crm/contracts/bulk-import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Failed to parse file");
        return;
      }

      setExtractionMethod(data.extractionMethod || "OCR & Document Intelligence");
      setExtractedContracts(data.contracts || []);
      toast.success(`Extracted ${data.contracts?.length || 0} contract(s) from ${selected.name}`);
    } catch (err: any) {
      toast.error(err.message || "An error occurred while reading file");
    }
  };

  const handleContractChange = (index: number, field: keyof ExtractedContract, value: string) => {
    setExtractedContracts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveContract = (index: number) => {
    setExtractedContracts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmImport = async () => {
    if (extractedContracts.length === 0) {
      toast.error("No valid contracts to import");
      return;
    }

    setIsImporting(true);
    try {
      const res = await fetch("/api/crm/contracts/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contracts: extractedContracts }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setResult({ imported: 0, skipped: 0, errors: [data.error || "Failed to import contracts"] });
        return;
      }

      setResult({
        imported: data.importedCount || extractedContracts.length,
        skipped: 0,
        errors: data.errors || [],
      });
      toast.success(`Successfully imported ${data.importedCount || extractedContracts.length} contract(s)!`);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      setResult({ imported: 0, skipped: 0, errors: [err.message || "Error saving contracts"] });
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
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Contracts from CSV, Excel, PDF (OCR)</DialogTitle>
          <DialogDescription>
            Upload contract spreadsheets, documents, or scanned PDFs. Extracted data can be edited in input boxes before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template & File Input */}
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

          {/* Extracted Contracts Preview Table with Editable Input Boxes */}
          {extractedContracts.length > 0 && !result && (
            <div className="rounded-md border overflow-x-auto max-h-[360px]">
              <Table className="min-w-[1200px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs min-w-[160px]">Title *</TableHead>
                    <TableHead className="text-xs min-w-[100px]">Value</TableHead>
                    <TableHead className="text-xs min-w-[80px]">Currency</TableHead>
                    <TableHead className="text-xs min-w-[140px]">Contract Type</TableHead>
                    <TableHead className="text-xs min-w-[120px]">Start Date</TableHead>
                    <TableHead className="text-xs min-w-[120px]">End Date</TableHead>
                    <TableHead className="text-xs min-w-[130px]">Renewal Date</TableHead>
                    <TableHead className="text-xs min-w-[130px]">Cust Signed Date</TableHead>
                    <TableHead className="text-xs min-w-[130px]">Comp Signed Date</TableHead>
                    <TableHead className="text-xs min-w-[180px]">Description</TableHead>
                    <TableHead className="text-xs w-[50px] text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractedContracts.map((contract, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="p-1">
                        <Input
                          value={contract.title || ""}
                          onChange={(e) => handleContractChange(idx, "title", e.target.value)}
                          className="h-7 text-xs font-medium"
                          placeholder="Contract Title"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={contract.value || ""}
                          onChange={(e) => handleContractChange(idx, "value", e.target.value)}
                          className="h-7 text-xs"
                          placeholder="10000"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={contract.currency || ""}
                          onChange={(e) => handleContractChange(idx, "currency", e.target.value)}
                          className="h-7 text-xs uppercase"
                          placeholder="USD"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={contract.type || ""}
                          onChange={(e) => handleContractChange(idx, "type", e.target.value)}
                          className="h-7 text-xs"
                          placeholder="Service Agreement"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="date"
                          value={contract.startDate || ""}
                          onChange={(e) => handleContractChange(idx, "startDate", e.target.value)}
                          className="h-7 text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="date"
                          value={contract.endDate || ""}
                          onChange={(e) => handleContractChange(idx, "endDate", e.target.value)}
                          className="h-7 text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="date"
                          value={contract.renewalReminderDate || ""}
                          onChange={(e) => handleContractChange(idx, "renewalReminderDate", e.target.value)}
                          className="h-7 text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="date"
                          value={contract.customerSignedDate || ""}
                          onChange={(e) => handleContractChange(idx, "customerSignedDate", e.target.value)}
                          className="h-7 text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="date"
                          value={contract.companySignedDate || ""}
                          onChange={(e) => handleContractChange(idx, "companySignedDate", e.target.value)}
                          className="h-7 text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={contract.description || ""}
                          onChange={(e) => handleContractChange(idx, "description", e.target.value)}
                          className="h-7 text-xs"
                          placeholder="Notes"
                        />
                      </TableCell>
                      <TableCell className="p-1 text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveContract(idx)}
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
          {extractedContracts.length > 0 && !result && (
            <Button onClick={handleConfirmImport} disabled={isImporting}>
              {isImporting ? "Importing..." : `Confirm Import (${extractedContracts.length} contracts)`}
            </Button>
          )}

          {/* Result Display */}
          {result && (
            <div className="space-y-3 pt-2">
              {result.imported > 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {result.imported} contract(s) imported successfully!
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
