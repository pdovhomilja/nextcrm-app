"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, Save, Clock } from "lucide-react";
import { SaveConfigDialog } from "./SaveConfigDialog";
import { ScheduleDialog } from "./ScheduleDialog";
import type { ReportCategory } from "@/actions/reports/types";
import { useTranslations } from "next-intl";

type ReportToolbarProps = { category: ReportCategory; currentFilters: string };

export function ReportToolbar({ category, currentFilters }: ReportToolbarProps) {
  const t = useTranslations("ReportsPage.toolbar");
  const [showSave, setShowSave] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  async function handleExportCSV() {
    const response = await fetch(`/api/reports/export?category=${category}&format=csv&${currentFilters}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${category}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportPDF() {
    const response = await fetch(`/api/reports/export?category=${category}&format=pdf&${currentFilters}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${category}-report.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleExportCSV}>
        <Download className="mr-2 h-4 w-4" />{t("exportCSV")}
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportPDF}>
        <FileText className="mr-2 h-4 w-4" />{t("exportPDF")}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setShowSave(true)}>
        <Save className="mr-2 h-4 w-4" />{t("saveConfig")}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setShowSchedule(true)}>
        <Clock className="mr-2 h-4 w-4" />{t("schedule")}
      </Button>
      <SaveConfigDialog open={showSave} onOpenChange={setShowSave} category={category} currentFilters={currentFilters} />
      <ScheduleDialog open={showSchedule} onOpenChange={setShowSchedule} />
    </div>
  );
}
