"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LineItemsEditor, LineItemRow } from "./line-items-editor";
import { TotalsPanel } from "./totals-panel";
import { INVOICE_TYPES } from "@/types/invoice";

interface Account {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
}

interface TaxRate {
  id: string;
  name: string;
  rate: string;
}

interface Series {
  id: string;
  name: string;
}

interface Currency {
  code: string;
  name: string;
}

interface Settings {
  baseCurrency: string;
  defaultSeriesId: string | null;
  defaultTaxRateId: string | null;
  defaultDueDays: number;
  bankName: string | null;
  iban: string | null;
  swift: string | null;
}

interface InvoiceFormProps {
  accounts: Account[];
  products: Product[];
  taxRates: TaxRate[];
  series: Series[];
  currencies: Currency[];
  settings: Settings | null;
  labels?: Record<string, string>;
  /** Existing invoice data for edit mode */
  initialData?: {
    id: string;
    type: string;
    accountId: string;
    seriesId: string | null;
    currency: string;
    dueDate: string | null;
    bankName: string | null;
    iban: string | null;
    swift: string | null;
    variableSymbol: string | null;
    publicNotes: string | null;
    internalNotes: string | null;
    lineItems: Array<{
      productId: string | null;
      description: string;
      quantity: string;
      unitPrice: string;
      discountPercent: string;
      taxRateId: string | null;
    }>;
  };
}

export function InvoiceForm({
  accounts,
  products,
  taxRates,
  series,
  currencies,
  settings,
  labels,
  initialData,
}: InvoiceFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isEdit = !!initialData;

  const [type, setType] = useState(initialData?.type ?? "INVOICE");
  const [accountId, setAccountId] = useState(initialData?.accountId ?? "");
  const [seriesId, setSeriesId] = useState(
    initialData?.seriesId ?? settings?.defaultSeriesId ?? ""
  );
  const [currency, setCurrency] = useState(
    initialData?.currency ?? settings?.baseCurrency ?? "CZK"
  );
  const [dueDate, setDueDate] = useState(() => {
    if (initialData?.dueDate) {
      return new Date(initialData.dueDate).toISOString().split("T")[0];
    }
    if (settings?.defaultDueDays) {
      const d = new Date();
      d.setDate(d.getDate() + settings.defaultDueDays);
      return d.toISOString().split("T")[0];
    }
    return "";
  });
  const [bankName, setBankName] = useState(
    initialData?.bankName ?? settings?.bankName ?? ""
  );
  const [iban, setIban] = useState(
    initialData?.iban ?? settings?.iban ?? ""
  );
  const [swift, setSwift] = useState(
    initialData?.swift ?? settings?.swift ?? ""
  );
  const [variableSymbol, setVariableSymbol] = useState(
    initialData?.variableSymbol ?? ""
  );
  const [publicNotes, setPublicNotes] = useState(
    initialData?.publicNotes ?? ""
  );
  const [internalNotes, setInternalNotes] = useState(
    initialData?.internalNotes ?? ""
  );

  const defaultTaxRateId = settings?.defaultTaxRateId ?? "";

  const [lineItems, setLineItems] = useState<LineItemRow[]>(() => {
    if (initialData?.lineItems?.length) {
      return initialData.lineItems.map((li) => ({
        productId: li.productId ?? "",
        description: li.description,
        quantity: parseFloat(li.quantity) || 1,
        unitPrice: parseFloat(li.unitPrice) || 0,
        discountPercent: parseFloat(li.discountPercent) || 0,
        taxRateId: li.taxRateId ?? "",
      }));
    }
    return [
      {
        productId: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        taxRateId: defaultTaxRateId,
      },
    ];
  });

  const getTaxRateValue = (taxRateId: string) => {
    const tr = taxRates.find((t) => t.id === taxRateId);
    return tr ? parseFloat(tr.rate) : 0;
  };

  const totalsInput = lineItems.map((li) => ({
    quantity: li.quantity,
    unitPrice: li.unitPrice,
    discountPercent: li.discountPercent,
    taxRate: getTaxRateValue(li.taxRateId),
  }));

  const handleSubmit = async () => {
    if (!accountId) {
      toast.error("Please select an account");
      return;
    }
    if (lineItems.length === 0 || !lineItems.some((l) => l.description)) {
      toast.error("At least one line item is required");
      return;
    }

    setSaving(true);
    try {
      const body = {
        type,
        accountId,
        seriesId: seriesId || null,
        currency,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        bankName: bankName || null,
        iban: iban || null,
        swift: swift || null,
        variableSymbol: variableSymbol || null,
        publicNotes: publicNotes || null,
        internalNotes: internalNotes || null,
        lineItems: lineItems
          .filter((l) => l.description)
          .map((l, i) => ({
            position: i,
            productId: l.productId || null,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountPercent: l.discountPercent,
            taxRateId: l.taxRateId || null,
          })),
      };

      const url = isEdit
        ? `/api/invoices/${initialData.id}`
        : "/api/invoices";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      const result = await res.json();
      toast.success(isEdit ? "Invoice updated" : "Invoice created");
      router.push(`/invoices/${result.id}`);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save invoice"
      );
    } finally {
      setSaving(false);
    }
  };

  const l = labels ?? {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{l.type ?? "Type"}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVOICE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{l.account ?? "Account"}</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{l.series ?? "Series"}</Label>
            <Select
              value={seriesId || "none"}
              onValueChange={(v) => setSeriesId(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select series..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-</SelectItem>
                {series.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{l.currency ?? "Currency"}</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{l.dueDate ?? "Due Date"}</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{l.variableSymbol ?? "Variable Symbol"}</Label>
            <Input
              value={variableSymbol}
              onChange={(e) => setVariableSymbol(e.target.value)}
              placeholder="Variable symbol"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{l.bankName ?? "Bank Name"}</Label>
            <Input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{l.iban ?? "IBAN"}</Label>
            <Input
              value={iban}
              onChange={(e) => setIban(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{l.swift ?? "SWIFT"}</Label>
            <Input
              value={swift}
              onChange={(e) => setSwift(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label className="mb-3 block">
            {l.lineItems ?? "Line Items"}
          </Label>
          <LineItemsEditor
            items={lineItems}
            onChange={setLineItems}
            products={products}
            taxRates={taxRates}
            labels={{
              product: l.product,
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discount: l.discount,
              taxRate: l.taxRate,
              total: l.total,
              addLine: l.addLine,
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{l.publicNotes ?? "Public Notes"}</Label>
            <Textarea
              value={publicNotes}
              onChange={(e) => setPublicNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>{l.internalNotes ?? "Internal Notes"}</Label>
            <Textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSubmit} disabled={saving}>
            {saving
              ? "Saving..."
              : isEdit
                ? "Update Draft"
                : (l.save ?? "Save Draft")}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <TotalsPanel lineItems={totalsInput} currency={currency} />
      </div>
    </div>
  );
}
