"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Sparkles,
  CheckCircle2,
  Trash2,
  Loader2,
  AlertCircle,
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
  DialogFooter,
} from "@/components/ui/dialog";
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

interface ExtractedLead {
  first_name?: string;
  last_name: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  description?: string;
  confidence?: "High" | "Medium" | "Low";
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

export function BulkImportLeadsModal({
  leadSources = [],
  leadStatuses = [],
  leadTypes = [],
  onFinish,
}: BulkImportLeadsModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "review" | "saving">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [extractionMethod, setExtractionMethod] = useState<string>("");
  const [extractedLeads, setExtractedLeads] = useState<ExtractedLead[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");

  const resetModal = () => {
    setStep("upload");
    setFile(null);
    setIsParsing(false);
    setExtractedLeads([]);
    setExtractionMethod("");
  };

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/crm/leads/bulk-import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Failed to parse file");
        setIsParsing(false);
        return;
      }

      setExtractionMethod(data.extractionMethod || "Document Intelligence");
      setExtractedLeads(data.leads || []);
      setStep("review");
      toast.success(`Detected ${data.totalDetected || 0} leads from ${selectedFile.name}`);
    } catch (err: any) {
      toast.error(err.message || "An error occurred while reading file");
    } finally {
      setIsParsing(false);
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

    setStep("saving");
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
        toast.error(data.error || "Failed to import leads");
        setStep("review");
        return;
      }

      toast.success(`Successfully imported ${data.importedCount} leads!`);
      setOpen(false);
      resetModal();
      router.refresh();
      if (onFinish) onFinish();
    } catch (err: any) {
      toast.error(err.message || "Error saving leads");
      setStep("review");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetModal(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-cyan-600/30 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-900/40 hover:text-cyan-300 shadow-sm">
          <Sparkles className="mr-1.5 h-4 w-4 text-cyan-400" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-slate-800 bg-[#0c121e] text-slate-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl font-bold text-white">
            <Upload className="mr-2 h-5 w-5 text-cyan-400" />
            Bulk Import Leads (Excel, CSV, PDF, OCR)
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Upload spreadsheets or documents to extract and bulk-import leads directly into your CRM.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="py-6">
            <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 p-8 text-center transition hover:border-cyan-500/50 hover:bg-slate-900/80">
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.pdf,.txt"
                className="absolute inset-0 cursor-pointer opacity-0"
                disabled={isParsing}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileChange(f);
                }}
              />
              {isParsing ? (
                <div className="flex flex-col items-center space-y-3">
                  <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
                  <p className="text-sm font-medium text-slate-200">
                    Extracting & OCR parsing document content...
                  </p>
                  <p className="text-xs text-slate-400">
                    Extracting contact fields, tables, and lead records
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3">
                  <div className="flex space-x-3">
                    <div className="rounded-lg bg-cyan-950/60 p-3 text-cyan-400 ring-1 ring-cyan-500/30">
                      <FileSpreadsheet className="h-7 w-7" />
                    </div>
                    <div className="rounded-lg bg-purple-950/60 p-3 text-purple-400 ring-1 ring-purple-500/30">
                      <FileText className="h-7 w-7" />
                    </div>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">
                      Drop your file here or click to browse
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Supports Excel (<code className="text-cyan-300">.xlsx</code>, <code className="text-cyan-300">.csv</code>), PDF documents (<code className="text-purple-300">.pdf</code>), and contact sheets
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-5 py-2">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
              <div className="flex items-center space-x-3">
                <FileCheck className="h-5 w-5 text-cyan-400" />
                <div>
                  <p className="text-sm font-semibold text-white">{file?.name}</p>
                  <p className="text-xs text-slate-400">
                    Found <strong className="text-cyan-300">{extractedLeads.length}</strong> leads using{" "}
                    <Badge variant="outline" className="ml-1 border-cyan-500/30 bg-cyan-950/30 text-cyan-300">
                      {extractionMethod}
                    </Badge>
                  </p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={resetModal} className="text-xs text-slate-400 hover:text-white">
                Upload different file
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <Label className="text-xs text-slate-300">Default Lead Source</Label>
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger className="mt-1 border-slate-700 bg-slate-900 text-slate-100">
                    <SelectValue placeholder="Select Source" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
                    {leadSources.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-300">Default Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="mt-1 border-slate-700 bg-slate-900 text-slate-100">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
                    {leadStatuses.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-300">Default Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="mt-1 border-slate-700 bg-slate-900 text-slate-100">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
                    {leadTypes.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
              <div className="max-h-[360px] overflow-y-auto overflow-x-auto">
                <table className="min-w-[960px] w-full text-left text-xs text-slate-200 border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 shadow-sm">
                    <tr>
                      <th className="px-3 py-2.5 min-w-[130px]">First Name</th>
                      <th className="px-3 py-2.5 min-w-[130px]">Last Name *</th>
                      <th className="px-3 py-2.5 min-w-[210px]">Email</th>
                      <th className="px-3 py-2.5 min-w-[160px]">Phone</th>
                      <th className="px-3 py-2.5 min-w-[150px]">Company</th>
                      <th className="px-3 py-2.5 min-w-[140px]">Job Title</th>
                      <th className="px-3 py-2.5 w-[60px] text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {extractedLeads.map((lead, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="p-2 min-w-[130px]">
                          <Input
                            value={lead.first_name || ""}
                            onChange={(e) => handleLeadChange(idx, "first_name", e.target.value)}
                            className="h-8 border-slate-800 bg-slate-900/90 px-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500/50"
                            placeholder="First Name"
                          />
                        </td>
                        <td className="p-2 min-w-[130px]">
                          <Input
                            value={lead.last_name || ""}
                            onChange={(e) => handleLeadChange(idx, "last_name", e.target.value)}
                            className="h-8 border-slate-800 bg-slate-900/90 px-2.5 text-xs text-slate-100 font-medium placeholder:text-slate-500 focus-visible:ring-cyan-500/50"
                            placeholder="Last Name"
                          />
                        </td>
                        <td className="p-2 min-w-[210px]">
                          <Input
                            value={lead.email || ""}
                            onChange={(e) => handleLeadChange(idx, "email", e.target.value)}
                            className="h-8 border-slate-800 bg-slate-900/90 px-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500/50"
                            placeholder="email@example.com"
                          />
                        </td>
                        <td className="p-2 min-w-[160px]">
                          <Input
                            value={lead.phone || ""}
                            onChange={(e) => handleLeadChange(idx, "phone", e.target.value)}
                            className="h-8 border-slate-800 bg-slate-900/90 px-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500/50"
                            placeholder="Phone Number"
                          />
                        </td>
                        <td className="p-2 min-w-[150px]">
                          <Input
                            value={lead.company || ""}
                            onChange={(e) => handleLeadChange(idx, "company", e.target.value)}
                            className="h-8 border-slate-800 bg-slate-900/90 px-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500/50"
                            placeholder="Company Name"
                          />
                        </td>
                        <td className="p-2 min-w-[140px]">
                          <Input
                            value={lead.jobTitle || ""}
                            onChange={(e) => handleLeadChange(idx, "jobTitle", e.target.value)}
                            className="h-8 border-slate-800 bg-slate-900/90 px-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500/50"
                            placeholder="Job Title"
                          />
                        </td>
                        <td className="p-2 w-[60px] text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveLead(idx)}
                            className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-950/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {step === "saving" && (
          <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
            <p className="text-base font-semibold text-white">Saving Leads to Database...</p>
            <p className="text-xs text-slate-400">Inserting {extractedLeads.length} leads with assigned settings</p>
          </div>
        )}

        <DialogFooter className="border-t border-slate-800/80 pt-4">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={step === "saving"} className="text-slate-400 hover:text-white">
            Cancel
          </Button>
          {step === "review" && (
            <Button onClick={handleConfirmImport} className="bg-cyan-600 text-white hover:bg-cyan-500 shadow-md">
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Import {extractedLeads.length} Leads
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
