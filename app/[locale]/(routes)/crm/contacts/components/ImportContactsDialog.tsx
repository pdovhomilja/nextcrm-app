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

const CONTACTS_CSV_TEMPLATE = `first_name,last_name,mobile_phone,office_phone,email,personal_email,website,birthday,description,position,social_twitter,social_facebook,social_linkedin,social_skype,social_youtube,social_tiktok
"John","Doe","+1 555-0101","+1 555-0102","john.doe@techcorp.com","johndoe@gmail.com","https://techcorp.com","1988-04-12","Key decision maker","CTO","@johndoe","https://facebook.com/johndoe","https://linkedin.com/in/johndoe","john.skype","https://youtube.com/c/johndoe","https://tiktok.com/@johndoe"
"Jane","Smith","+1 555-0201","+1 555-0202","jane.smith@innovate.io","janesmith@yahoo.com","https://innovate.io","1992-09-25","VP of Product","VP Product","@janesmith","https://facebook.com/janesmith","https://linkedin.com/in/janesmith","jane.skype","",""`;

interface ExtractedContact {
  first_name?: string;
  last_name: string;
  mobile_phone?: string;
  office_phone?: string;
  email?: string;
  personal_email?: string;
  website?: string;
  birthday?: string;
  description?: string;
  position?: string;
  social_twitter?: string;
  social_facebook?: string;
  social_linkedin?: string;
  social_skype?: string;
  social_youtube?: string;
  social_tiktok?: string;
}

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

export function ImportContactsDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [extractedContacts, setExtractedContacts] = useState<ExtractedContact[]>([]);
  const [extractionMethod, setExtractionMethod] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setExtractedContacts([]);
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
    const blob = new Blob([CONTACTS_CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts_import_template.csv";
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
      const res = await fetch("/api/crm/contacts/bulk-import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Failed to parse file");
        return;
      }

      setExtractionMethod(data.extractionMethod || "OCR & Document Intelligence");
      setExtractedContacts(data.contacts || []);
      toast.success(`Extracted ${data.contacts?.length || 0} contact(s) from ${selected.name}`);
    } catch (err: any) {
      toast.error(err.message || "An error occurred while reading file");
    }
  };

  const handleContactChange = (index: number, field: keyof ExtractedContact, value: string) => {
    setExtractedContacts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveContact = (index: number) => {
    setExtractedContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmImport = async () => {
    if (extractedContacts.length === 0) {
      toast.error("No valid contacts to import");
      return;
    }

    setIsImporting(true);
    try {
      const res = await fetch("/api/crm/contacts/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: extractedContacts }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setResult({ imported: 0, skipped: 0, errors: [data.error || "Failed to import contacts"] });
        return;
      }

      setResult({
        imported: data.importedCount || extractedContacts.length,
        skipped: 0,
        errors: data.errors || [],
      });
      toast.success(`Successfully imported ${data.importedCount || extractedContacts.length} contact(s)!`);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      setResult({ imported: 0, skipped: 0, errors: [err.message || "Error saving contacts"] });
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
          <DialogTitle>Import Contacts from CSV, Excel, PDF (OCR)</DialogTitle>
          <DialogDescription>
            Upload contact spreadsheets, documents, or scanned PDFs. Extracted details can be edited in input boxes before confirming.
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
          {extractedContacts.length > 0 && !result && (
            <div className="rounded-md border overflow-x-auto max-h-[360px]">
              <Table className="min-w-[1200px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs min-w-[130px]">First Name</TableHead>
                    <TableHead className="text-xs min-w-[130px]">Last Name *</TableHead>
                    <TableHead className="text-xs min-w-[180px]">Email</TableHead>
                    <TableHead className="text-xs min-w-[130px]">Mobile Phone</TableHead>
                    <TableHead className="text-xs min-w-[130px]">Office Phone</TableHead>
                    <TableHead className="text-xs min-w-[130px]">Position</TableHead>
                    <TableHead className="text-xs min-w-[150px]">Website</TableHead>
                    <TableHead className="text-xs min-w-[180px]">Personal Email</TableHead>
                    <TableHead className="text-xs w-[50px] text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractedContacts.map((contact, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="p-1">
                        <Input
                          value={contact.first_name || ""}
                          onChange={(e) => handleContactChange(idx, "first_name", e.target.value)}
                          className="h-7 text-xs"
                          placeholder="First Name"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={contact.last_name || ""}
                          onChange={(e) => handleContactChange(idx, "last_name", e.target.value)}
                          className="h-7 text-xs font-medium"
                          placeholder="Last Name"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={contact.email || ""}
                          onChange={(e) => handleContactChange(idx, "email", e.target.value)}
                          className="h-7 text-xs"
                          placeholder="email@example.com"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={contact.mobile_phone || ""}
                          onChange={(e) => handleContactChange(idx, "mobile_phone", e.target.value)}
                          className="h-7 text-xs"
                          placeholder="+1 555-0100"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={contact.office_phone || ""}
                          onChange={(e) => handleContactChange(idx, "office_phone", e.target.value)}
                          className="h-7 text-xs"
                          placeholder="+1 555-0200"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={contact.position || ""}
                          onChange={(e) => handleContactChange(idx, "position", e.target.value)}
                          className="h-7 text-xs"
                          placeholder="CTO"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={contact.website || ""}
                          onChange={(e) => handleContactChange(idx, "website", e.target.value)}
                          className="h-7 text-xs"
                          placeholder="https://domain.com"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={contact.personal_email || ""}
                          onChange={(e) => handleContactChange(idx, "personal_email", e.target.value)}
                          className="h-7 text-xs"
                          placeholder="personal@gmail.com"
                        />
                      </TableCell>
                      <TableCell className="p-1 text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveContact(idx)}
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
          {extractedContacts.length > 0 && !result && (
            <Button onClick={handleConfirmImport} disabled={isImporting}>
              {isImporting ? "Importing..." : `Confirm Import (${extractedContacts.length} contacts)`}
            </Button>
          )}

          {/* Result Display */}
          {result && (
            <div className="space-y-3 pt-2">
              {result.imported > 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {result.imported} contact(s) imported successfully!
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
