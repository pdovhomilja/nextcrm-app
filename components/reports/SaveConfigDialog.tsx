"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { saveConfig } from "@/actions/reports/config";
import type { ReportCategory } from "@/actions/reports/types";
import { useTranslations } from "next-intl";

type SaveConfigDialogProps = { open: boolean; onOpenChange: (open: boolean) => void; category: ReportCategory; currentFilters: string };

export function SaveConfigDialog({ open, onOpenChange, category, currentFilters }: SaveConfigDialogProps) {
  const t = useTranslations("ReportsPage.saveDialog");
  const [name, setName] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setLoading(true);
    const params = Object.fromEntries(new URLSearchParams(currentFilters));
    await saveConfig({ name: name.trim(), category, filters: params, isShared });
    setLoading(false);
    setName("");
    setIsShared(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("title")}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="config-name">{t("nameLabel")}</Label>
            <Input id="config-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="share-toggle">{t("shareLabel")}</Label>
            <Switch id="share-toggle" checked={isShared} onCheckedChange={setIsShared} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button onClick={handleSave} disabled={loading || !name.trim()}>{t("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
