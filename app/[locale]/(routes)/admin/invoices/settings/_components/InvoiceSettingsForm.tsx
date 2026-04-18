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

interface Currency {
  code: string;
  name: string;
}

interface Series {
  id: string;
  name: string;
}

interface TaxRate {
  id: string;
  name: string;
  rate: string;
}

interface Settings {
  id: string;
  baseCurrency: string;
  defaultSeriesId: string | null;
  defaultTaxRateId: string | null;
  defaultDueDays: number;
  bankName: string | null;
  bankAccount: string | null;
  iban: string | null;
  swift: string | null;
  footerText: string | null;
}

interface Props {
  settings: Settings | null;
  currencies: Currency[];
  series: Series[];
  taxRates: TaxRate[];
}

export function InvoiceSettingsForm({
  settings,
  currencies,
  series,
  taxRates,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [baseCurrency, setBaseCurrency] = useState(
    settings?.baseCurrency ?? "CZK"
  );
  const [defaultSeriesId, setDefaultSeriesId] = useState(
    settings?.defaultSeriesId ?? ""
  );
  const [defaultTaxRateId, setDefaultTaxRateId] = useState(
    settings?.defaultTaxRateId ?? ""
  );
  const [defaultDueDays, setDefaultDueDays] = useState(
    settings?.defaultDueDays?.toString() ?? "14"
  );
  const [bankName, setBankName] = useState(settings?.bankName ?? "");
  const [bankAccount, setBankAccount] = useState(
    settings?.bankAccount ?? ""
  );
  const [iban, setIban] = useState(settings?.iban ?? "");
  const [swift, setSwift] = useState(settings?.swift ?? "");
  const [footerText, setFooterText] = useState(settings?.footerText ?? "");

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/invoices/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseCurrency,
          defaultSeriesId: defaultSeriesId || null,
          defaultTaxRateId: defaultTaxRateId || null,
          defaultDueDays: parseInt(defaultDueDays) || 14,
          bankName: bankName || null,
          bankAccount: bankAccount || null,
          iban: iban || null,
          swift: swift || null,
          footerText: footerText || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Settings saved");
      router.refresh();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Base Currency</Label>
          <Select value={baseCurrency} onValueChange={setBaseCurrency}>
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
          <Label>Default Due Days</Label>
          <Input
            type="number"
            value={defaultDueDays}
            onChange={(e) => setDefaultDueDays(e.target.value)}
            min={1}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Default Series</Label>
          <Select value={defaultSeriesId} onValueChange={setDefaultSeriesId}>
            <SelectTrigger>
              <SelectValue placeholder="Select series..." />
            </SelectTrigger>
            <SelectContent>
              {series.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Default Tax Rate</Label>
          <Select value={defaultTaxRateId} onValueChange={setDefaultTaxRateId}>
            <SelectTrigger>
              <SelectValue placeholder="Select tax rate..." />
            </SelectTrigger>
            <SelectContent>
              {taxRates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} ({t.rate}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Bank Name</Label>
          <Input
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="e.g. Komercni banka"
          />
        </div>
        <div className="space-y-2">
          <Label>Bank Account</Label>
          <Input
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            placeholder="e.g. 123456789/0100"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>IBAN</Label>
          <Input
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            placeholder="e.g. CZ6508000000192000145399"
          />
        </div>
        <div className="space-y-2">
          <Label>SWIFT</Label>
          <Input
            value={swift}
            onChange={(e) => setSwift(e.target.value)}
            placeholder="e.g. KOMBCZPP"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Footer Text</Label>
        <Textarea
          value={footerText}
          onChange={(e) => setFooterText(e.target.value)}
          placeholder="Text displayed at the bottom of invoices"
          rows={3}
        />
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
