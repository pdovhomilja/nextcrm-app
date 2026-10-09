"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import AlertModal from "@/components/modals/alert-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { deletePriceList, updatePriceList } from "@/actions/crm/price-lists/price-lists";
import type { PriceListDetail } from "@/actions/crm/price-lists/queries";

export function PriceListHeader({ list, canWrite, currencies }: { list: PriceListDetail; canWrite: boolean; currencies: string[] }) {
  const t = useTranslations("PriceListsPage");
  const router = useRouter();
  const [name, setName] = useState(list.name);
  const [currency, setCurrency] = useState(list.currency);
  const [isActive, setActive] = useState(list.isActive);
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const fail = (e: string) => toast.error(t(`error.${e.split(":")[0]}` as never));
  const save = () => start(async () => {
    const res = await updatePriceList(list.id, { name, currency, isActive });
    if ("error" in res) { fail(res.error); return; }
    toast.success(t("saved")); router.refresh();
  });
  const remove = () => start(async () => {
    const res = await deletePriceList(list.id);
    setConfirming(false);
    if ("error" in res) { fail(res.error); return; }
    router.push("/crm/price-lists");
  });
  if (!canWrite) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>{list.currency}</span>
        {!list.isActive && <Badge variant="secondary">{t("archived")}</Badge>}
        {list.source === "EXTERNAL" && <Badge>{t("syncedExternal")}</Badge>}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-3">
      <AlertModal isOpen={confirming} onClose={() => setConfirming(false)} onConfirm={remove} loading={pending} />
      <Input className="max-w-xs" value={name} onChange={(e) => setName(e.target.value)} aria-label={t("name")} />
      <Select value={currency} onValueChange={setCurrency}>
        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
        <SelectContent>{currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
      </Select>
      <label className="flex items-center gap-2 text-sm"><Switch checked={isActive} onCheckedChange={setActive} />{t("active")}</label>
      <Button disabled={pending || !name.trim()} onClick={save}>{t("save")}</Button>
      <Button variant="outline" disabled={pending} onClick={() => setConfirming(true)}>{t("delete")}</Button>
    </div>
  );
}
