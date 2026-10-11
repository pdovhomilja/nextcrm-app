"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const entities = [
  { value: "leads", label: "Leads", required: "lastName" },
  { value: "contacts", label: "Contacts", required: "last_name" },
  { value: "accounts", label: "Clients / Accounts", required: "name" },
  { value: "projects", label: "Projects", required: "title" },
];

export default function DataTransferPage() {
  const [entity, setEntity] = useState("leads");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = entities.find((item) => item.value === entity)!;

  async function exportData() {
    setBusy(true);
    try {
      const response = await fetch(`/api/crm/data-transfer?entity=${entity}`);
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `vensai-${entity}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${selected.label} exported`);
    } catch { toast.error("Could not export this data"); }
    finally { setBusy(false); }
  }

  async function importData(file: File) {
    setBusy(true);
    const form = new FormData();
    form.append("entity", entity);
    form.append("file", file);
    try {
      const response = await fetch("/api/crm/data-transfer", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Import failed");
      toast.success(`${result.imported} ${selected.label.toLowerCase()} imported${result.skipped ? `; ${result.skipped} skipped` : ""}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not import this file"); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import & export</h1>
        <p className="mt-1 text-muted-foreground">Move CRM data in bulk with Excel or CSV files.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Choose data</CardTitle>
          <CardDescription>Exports include a ready-to-reuse standard template for the selected record type.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Select value={entity} onValueChange={setEntity} disabled={busy}>
            <SelectTrigger className="max-w-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{entities.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
          </Select>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-5">
              <FileSpreadsheet className="mb-4 h-8 w-8 text-primary" />
              <h2 className="font-medium">Download template or export</h2>
              <p className="mt-1 text-sm text-muted-foreground">Download your existing records with standard headers, or use the empty structure when there are no records yet.</p>
              <Button className="mt-4" onClick={exportData} disabled={busy}><Download className="mr-2 h-4 w-4" />Export XLSX</Button>
            </div>
            <div className="rounded-lg border p-5">
              <Upload className="mb-4 h-8 w-8 text-primary" />
              <h2 className="font-medium">Import records</h2>
              <p className="mt-1 text-sm text-muted-foreground">Upload .xlsx or .csv. Headers are matched automatically, ignoring spaces, hyphens, underscores, and letter case.</p>
              <input ref={inputRef} className="sr-only" type="file" accept=".xlsx,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importData(file); }} />
              <Button className="mt-4" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}><Upload className="mr-2 h-4 w-4" />Upload file</Button>
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <p className="font-medium">Required column for {selected.label}: <code>{selected.required}</code></p>
            <p className="mt-1 text-muted-foreground">Rows without this value are skipped. Maximum 5,000 rows and 10 MB per upload. Legacy .xls files should be saved as .xlsx first.</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
