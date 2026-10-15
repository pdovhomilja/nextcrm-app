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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const LEADS_CSV_TEMPLATE = `first_name,last_name,company,jobTitle,email,phone,description
"John","Smith","Acme Corp","VP of Sales","john.smith@acme.com","+1 555-0199","Met at Tech Conference"
"Sarah","Connor","Cyberdyne Inc","Security Director","sarah@cyberdyne.io","+1 555-0188","Inquired about Enterprise plan"`;

interface ExtractedLead {
  first_name?: string;
  last_name: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  description?: string;
}

interface ConfigItem {
  id: string;
  name: string;
}

interface BulkImportLeadsModalProps {
  leadSources?: ConfigItem[];
  leadStatuses?: ConfigItem[];
  leadTypes?: ConfigItem[];
  onFinish?: () => void;
}

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

export function BulkImportLeadsModal({
  leadSources = [],
  leadStatuses = [],
  leadTypes = [],
  onFinish,
}: BulkImportLeadsModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [extractedLeads, setExtractedLeads] = useState<ExtractedLead[]>([]);
  const [extractionMethod, setExtractionMethod] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setExtractedLeads([]);
    setExtractionMethod("");
    setResult(null);
    setIsImporting(false);
    setSelectedSource("");
    setSelectedStatus("");
    setSelectedType("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    setOpen(false);
  };

  const downloadTemplate = () => {
    const blob = new Blob([LEADS_CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads_import_template.csv";
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
      const res = await fetch("/api/crm/leads/bulk-import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Failed to parse file");
        return;
      }

      setExtractionMethod(data.extractionMethod || "OCR & Document Intelligence");
      setExtractedLeads(data.leads || []);
      toast.success(`Loaded ${data.leads?.length || 0} lead(s) from ${selected.name}`);
    } catch (err: any) {
      toast.error(err.message || "An error occurred while reading file");
    }
  };

  const handleLeadChange = (index: number, field: keyof ExtractedLead, value: string) => {
    setExtractedLeads((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveLead = (index: number) => {
    setExtractedLeads((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmImport = async () => {
    if (extractedLeads.length === 0) {
      toast.error("No valid leads to import");
      return;
    }

    setIsImporting(true);
    try {
      const res = await fetch("/api/crm/leads/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: extractedLeads,
          lead_source_id: selectedSource || undefined,
          lead_status_id: selectedStatus || undefined,
          lead_type_id: selectedType || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setResult({ imported: 0, skipped: 0, errors: [data.error || "Failed to import leads"] });
        return;
      }

      setResult({
        imported: data.importedCount || extractedLeads.length,
        skipped: 0,
        errors: [],
      });
      toast.success(`Successfully imported ${data.importedCount || extractedLeads.length} leads!`);
      startTransition(() => {
        router.refresh();
      });
      if (onFinish) onFinish();
    } catch (err: any) {
      setResult({ imported: 0, skipped: 0, errors: [err.message || "Error saving leads"] });
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
          <DialogTitle>Import Leads from CSV, Excel, PDF (OCR)</DialogTitle>
          <DialogDescription>
            Upload lead spreadsheets, documents, or scanned PDFs. Extracted fields can be edited in input boxes before confirming.
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
              accept=".csv,.xlsx,.xls,.txt,.pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          {/* Configuration Options */}
          {extractedLeads.length > 0 && !result && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div>
                <Label className="text-xs">Default Lead Source</Label>
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger className="h-8 mt-1 text-xs">
                    <SelectValue placeholder="Select Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadSources.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Default Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="h-8 mt-1 text-xs">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadStatuses.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Default Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="h-8 mt-1 text-xs">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadTypes.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Preview Table with Editable Inputs */}
          {extractedLeads.length > 0 && !result && (
            <div className="rounded-md border overflow-x-auto max-h-[360px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">First Name</TableHead>
                    <TableHead className="text-xs">Last Name *</TableHead>
                    <TableHead className="text-xs">Company</TableHead>
                    <TableHead className="text-xs">Job Title</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Phone</TableHead>
                    <TableHead className="text-xs w-[50px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractedLeads.map((lead, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="p-1">
                        <Input
                          value={lead.first_name || ""}
                          onChange={(e) => handleLeadChange(idx, "first_name", e.target.value)}
                          className="h-7 text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={lead.last_name || ""}
                          onChange={(e) => handleLeadChange(idx, "last_name", e.target.value)}
                          className="h-7 text-xs font-medium"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={lead.company || ""}
                          onChange={(e) => handleLeadChange(idx, "company", e.target.value)}
                          className="h-7 text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={lead.jobTitle || ""}
                          onChange={(e) => handleLeadChange(idx, "jobTitle", e.target.value)}
                          className="h-7 text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={lead.email || ""}
                          onChange={(e) => handleLeadChange(idx, "email", e.target.value)}
                          className="h-7 text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={lead.phone || ""}
                          onChange={(e) => handleLeadChange(idx, "phone", e.target.value)}
                          className="h-7 text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-1 text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveLead(idx)}
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
          {extractedLeads.length > 0 && !result && (
            <Button onClick={handleConfirmImport} disabled={isImporting}>
              {isImporting ? "Importing..." : `Confirm Import (${extractedLeads.length} leads)`}
            </Button>
          )}

          {/* Result Display */}
          {result && (
            <div className="space-y-3 pt-2">
              {result.imported > 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {result.imported} lead(s) imported successfully!
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
