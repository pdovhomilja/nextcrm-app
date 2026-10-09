"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { checkPrice, type CheckedPrice } from "@/actions/crm/price-lists/price-lists";

export function PriceCheckPanel({ priceListId, products }: { priceListId: string; products: { id: string; name: string }[] }) {
  const t = useTranslations("PriceListsPage");
  const [productId, setProduct] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<CheckedPrice | string | null>(null);
  const [pending, start] = useTransition();
  const run = () => start(async () => {
    const res = await checkPrice({ priceListId, productId, quantity: Number(quantity), date: `${date}T12:00:00Z` });
    setResult("error" in res ? res.error : res.data);
  });
  return (
    <section className="space-y-3 rounded-md border p-4">
      <h2 className="font-medium">{t("priceCheck")}</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1"><Label>{t("product")}</Label>
          <Select value={productId} onValueChange={setProduct}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label>{t("quantity")}</Label><Input className="w-24" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
        <div className="space-y-1"><Label>{t("date")}</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <Button disabled={pending || !productId} onClick={run}>{t("calculate")}</Button>
      </div>
      {typeof result === "string" && <p className="text-sm text-destructive">{result}</p>}
      {result && typeof result === "object" && (
        <div className="text-sm">
          <p className="text-lg font-semibold">{result.price} {result.currency}</p>
          <p className="text-muted-foreground">{t("listPrice")}: {result.listPrice} {result.currency} · {result.ruleId ? t("ruleApplied") : t("noRule")}</p>
          <ol className="mt-2 list-decimal pl-5">{result.steps.map((s, i) => <li key={i}>{t(`step.${s.label}` as never)}: {s.value}</li>)}</ol>
        </div>
      )}
    </section>
  );
}
