"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { upsertPriceListRule } from "@/actions/crm/price-lists/price-lists";
import type { PriceListDetail } from "@/actions/crm/price-lists/queries";

type Option = { id: string; name: string };
type Rule = PriceListDetail["rules"][number];
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

export function RuleSheet({ priceListId, rule, products, categories, lists, onClose }: {
  priceListId: string; rule: Rule | null; products: Option[]; categories: Option[]; lists: Option[]; onClose: (saved: boolean) => void;
}) {
  const t = useTranslations("PriceListsPage");
  const [f, setF] = useState(() => ({
    appliesTo: rule?.appliesTo ?? "ALL", categoryId: rule?.categoryId ?? "", productId: rule?.productId ?? "",
    minQuantity: String(rule?.minQuantity ?? 0), dateStart: rule?.dateStart ?? "", dateEnd: rule?.dateEnd ?? "",
    computePrice: rule?.computePrice ?? "FIXED", fixedPrice: rule?.fixedPrice?.toString() ?? "", percentPrice: rule?.percentPrice?.toString() ?? "",
    base: rule?.base ?? "LIST_PRICE", basePriceListId: rule?.basePriceListId ?? "", priceDiscount: String(rule?.priceDiscount ?? 0),
    priceSurcharge: String(rule?.priceSurcharge ?? 0), priceRound: rule?.priceRound?.toString() ?? "",
    priceMinMargin: rule?.priceMinMargin?.toString() ?? "", priceMaxMargin: rule?.priceMaxMargin?.toString() ?? "",
  }));
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const field = (k: keyof typeof f, label: string, type = "number") => (
    <div className="space-y-1"><Label>{label}</Label><Input type={type} value={f[k]} onChange={(e) => set(k)(e.target.value)} /></div>
  );
  const select = (k: keyof typeof f, label: string, options: { value: string; label: string }[]) => (
    <div className="space-y-1"><Label>{label}</Label>
      <Select value={f[k]} onValueChange={set(k)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
  const save = () => start(async () => {
    const res = await upsertPriceListRule(priceListId, rule?.id ?? null, {
      appliesTo: f.appliesTo as never, categoryId: f.categoryId || null, productId: f.productId || null,
      minQuantity: numOrNull(f.minQuantity), dateStart: f.dateStart ? new Date(`${f.dateStart}T00:00:00Z`) : null,
      dateEnd: f.dateEnd ? new Date(`${f.dateEnd}T00:00:00Z`) : null, computePrice: f.computePrice as never,
      fixedPrice: numOrNull(f.fixedPrice), percentPrice: numOrNull(f.percentPrice), base: f.base as never,
      basePriceListId: f.basePriceListId || null, priceDiscount: numOrNull(f.priceDiscount), priceSurcharge: numOrNull(f.priceSurcharge),
      priceRound: numOrNull(f.priceRound), priceMinMargin: numOrNull(f.priceMinMargin), priceMaxMargin: numOrNull(f.priceMaxMargin),
    });
    if ("error" in res) {
      const [kind, detail] = res.error.split(":");
      toast.error(kind === "invalid" ? detail.split(",").map((p) => t(`problem.${p}` as never)).join(" ") : t(`error.${kind}` as never));
      return;
    }
    onClose(true);
  });
  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(false); }}>
      <SheetContent className="overflow-y-auto sm:max-w-[480px]">
        <SheetHeader><SheetTitle>{rule ? t("editRule") : t("addRule")}</SheetTitle></SheetHeader>
        <div className="space-y-3 p-4">
          {select("appliesTo", t("appliesTo"), [{ value: "ALL", label: t("targetAll") }, { value: "CATEGORY", label: t("category") }, { value: "PRODUCT", label: t("product") }])}
          {f.appliesTo === "CATEGORY" && select("categoryId", t("category"), categories.map((c) => ({ value: c.id, label: c.name })))}
          {f.appliesTo === "PRODUCT" && select("productId", t("product"), products.map((p) => ({ value: p.id, label: p.name })))}
          {field("minQuantity", t("minQuantity"))}
          <div className="grid grid-cols-2 gap-2">{field("dateStart", t("dateStart"), "date")}{field("dateEnd", t("dateEnd"), "date")}</div>
          {select("computePrice", t("computePrice"), [{ value: "FIXED", label: t("computeFIXED") }, { value: "PERCENTAGE", label: t("computePERCENTAGE") }, { value: "FORMULA", label: t("computeFORMULA") }])}
          {f.computePrice === "FIXED" && field("fixedPrice", t("fixedPrice"))}
          {f.computePrice !== "FIXED" && select("base", t("base"), [{ value: "LIST_PRICE", label: t("baseLIST_PRICE") }, { value: "COST", label: t("baseCOST") }, { value: "PRICE_LIST", label: t("basePRICE_LIST") }])}
          {f.computePrice !== "FIXED" && f.base === "PRICE_LIST" && select("basePriceListId", t("basePriceList"), lists.map((l) => ({ value: l.id, label: l.name })))}
          {f.computePrice === "PERCENTAGE" && field("percentPrice", t("percentPrice"))}
          {f.computePrice === "FORMULA" && (<>
            {field("priceDiscount", t("priceDiscount"))}
            {field("priceRound", t("priceRound"))}
            {field("priceSurcharge", t("priceSurcharge"))}
            <div className="grid grid-cols-2 gap-2">{field("priceMinMargin", t("priceMinMargin"))}{field("priceMaxMargin", t("priceMaxMargin"))}</div>
          </>)}
          <Button disabled={pending} onClick={save}>{t("save")}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
