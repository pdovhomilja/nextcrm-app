"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadConfigs } from "@/actions/reports/config";
import type { ReportCategory } from "@/actions/reports/types";
import { useTranslations } from "next-intl";

type SavedReportsDropdownProps = { category: ReportCategory };

export function SavedReportsDropdown({ category }: SavedReportsDropdownProps) {
  const t = useTranslations("ReportsPage.savedReports");
  const router = useRouter();
  const pathname = usePathname();
  const [configs, setConfigs] = useState<{ id: string; name: string; filters: Record<string, string>; isShared: boolean }[]>([]);

  useEffect(() => {
    loadConfigs(category).then((result) => {
      setConfigs(result.map((c: any) => ({ id: c.id, name: c.name, filters: c.filters as Record<string, string>, isShared: c.isShared })));
    });
  }, [category]);

  function handleSelect(configId: string) {
    const config = configs.find((c) => c.id === configId);
    if (!config) return;
    const params = new URLSearchParams(config.filters);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (configs.length === 0) return null;

  return (
    <Select onValueChange={handleSelect}>
      <SelectTrigger className="w-[200px]"><SelectValue placeholder={t("placeholder")} /></SelectTrigger>
      <SelectContent>
        {configs.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name} {c.isShared ? `(${t("shared")})` : ""}</SelectItem>))}
      </SelectContent>
    </Select>
  );
}
