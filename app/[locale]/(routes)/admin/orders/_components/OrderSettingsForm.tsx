"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveOrderSettings } from "../_actions/orders";

type Settings = { name: string; template: string; resetPolicy: "YEARLY" | "NEVER"; active: boolean; emails: boolean; preview: string };

export function OrderSettingsForm({ initial }: { initial: Settings }) {
  const t = useTranslations("OrdersAdminPage");
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [pending, start] = useTransition();
  const save = () => start(async () => {
    const res = await saveOrderSettings({ name: s.name, template: s.template, resetPolicy: s.resetPolicy, active: s.active, emails: s.emails });
    if ("error" in res) { toast.error(t("invalid")); return; }
    toast.success(t("saved"));
    router.refresh();
  });
  return (
    <div className="max-w-xl space-y-4">
      <h2 className="font-medium">{t("series")}</h2>
      <label className="block space-y-1 text-sm"><span>{t("seriesName")}</span><Input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></label>
      <label className="block space-y-1 text-sm"><span>{t("template")}</span><Input value={s.template} onChange={(e) => setS({ ...s, template: e.target.value })} />
        <span className="text-xs text-muted-foreground">{t("templateHelp")}</span></label>
      <p className="text-sm">{t("preview", { number: initial.preview })}</p>
      <label className="block space-y-1 text-sm"><span>{t("reset")}</span>
        <Select value={s.resetPolicy} onValueChange={(v) => setS({ ...s, resetPolicy: v as Settings["resetPolicy"] })}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="YEARLY">{t("resetYEARLY")}</SelectItem><SelectItem value="NEVER">{t("resetNEVER")}</SelectItem></SelectContent>
        </Select>
      </label>
      <label className="flex items-center gap-2 text-sm"><Switch checked={s.active} onCheckedChange={(v) => setS({ ...s, active: v })} />{t("active")}</label>
      <label className="flex items-center gap-2 text-sm"><Switch checked={s.emails} onCheckedChange={(v) => setS({ ...s, emails: v })} />{t("emails")}</label>
      <Button disabled={pending} onClick={save}>{t("save")}</Button>
    </div>
  );
}
