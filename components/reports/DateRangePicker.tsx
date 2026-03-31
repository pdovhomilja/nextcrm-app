"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { DATE_PRESETS } from "@/actions/reports/types";
import { useTranslations } from "next-intl";

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("ReportsPage");

  const currentFrom = searchParams.get("from");
  const currentTo = searchParams.get("to");

  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    currentFrom ? new Date(currentFrom) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    currentTo ? new Date(currentTo) : undefined
  );

  function applyDates(from: Date, to: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", from.toISOString().split("T")[0]);
    params.set("to", to.toISOString().split("T")[0]);
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyPreset(key: string) {
    const preset = DATE_PRESETS.find((p) => p.key === key);
    if (!preset) return;
    const { from, to } = preset.getRange();
    setDateFrom(from);
    setDateTo(to);
    applyDates(from, to);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {DATE_PRESETS.map((preset) => (
        <Button
          key={preset.key}
          variant="outline"
          size="sm"
          onClick={() => applyPreset(preset.key)}
        >
          {t(preset.labelKey)}
        </Button>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {t("customRange")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex gap-2 p-4">
            <div>
              <p className="text-sm font-medium mb-2">{t("from")}</p>
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={(date) => {
                  setDateFrom(date);
                  if (date && dateTo) applyDates(date, dateTo);
                }}
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">{t("to")}</p>
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={(date) => {
                  setDateTo(date);
                  if (dateFrom && date) applyDates(dateFrom, date);
                }}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
