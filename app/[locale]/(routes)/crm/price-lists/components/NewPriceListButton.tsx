"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createPriceList } from "@/actions/crm/price-lists/price-lists";

export function NewPriceListButton({ currencies }: { currencies: string[] }) {
  const t = useTranslations("PriceListsPage");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState(currencies[0] ?? "");
  const [pending, start] = useTransition();
  const save = () => start(async () => {
    const res = await createPriceList({ name, currency });
    if ("error" in res) { toast.error(t(`error.${res.error.split(":")[0]}` as never)); return; }
    setOpen(false);
    router.push(`/crm/price-lists/${res.data.id}`);
  });
  return (
    <>
      <Button onClick={() => setOpen(true)}>{t("new")}</Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader><SheetTitle>{t("new")}</SheetTitle></SheetHeader>
          <div className="space-y-4 p-4">
            <div className="space-y-1"><Label>{t("name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1"><Label>{t("currency")}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button disabled={pending || !name.trim()} onClick={save}>{t("save")}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
