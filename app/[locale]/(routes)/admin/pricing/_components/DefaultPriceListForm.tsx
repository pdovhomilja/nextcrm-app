"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setDefaultPriceList } from "../_actions/pricing";

const NONE = "__none__";

export function DefaultPriceListForm({ lists, current }: { lists: { id: string; name: string; currency: string }[]; current: string | null }) {
  const t = useTranslations("AdminPage");
  const [value, setValue] = useState(current ?? NONE);
  const [pending, start] = useTransition();
  return (
    <div className="flex items-end gap-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{t("defaultPriceList")}</p>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("noDefault")}</SelectItem>
            {lists.map((l) => <SelectItem key={l.id} value={l.id}>{l.name} ({l.currency})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Button disabled={pending} onClick={() => start(async () => {
        const res = await setDefaultPriceList(value === NONE ? null : value);
        if ("error" in res) toast.error(res.error); else toast.success("OK");
      })}>{t("save")}</Button>
    </div>
  );
}
