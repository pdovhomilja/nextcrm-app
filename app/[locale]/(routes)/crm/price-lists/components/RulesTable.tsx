"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import AlertModal from "@/components/modals/alert-modal";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deletePriceListRule } from "@/actions/crm/price-lists/price-lists";
import type { PriceListDetail } from "@/actions/crm/price-lists/queries";
import { ruleSummary } from "./rule-summary";
import { RuleSheet } from "./RuleSheet";

type Option = { id: string; name: string };
const RANK = { PRODUCT: 0, CATEGORY: 1, ALL: 2 } as const;

export function RulesTable({ list, canWrite, products, categories, lists }: { list: PriceListDetail; canWrite: boolean; products: Option[]; categories: Option[]; lists: Option[] }) {
  const t = useTranslations("PriceListsPage");
  const router = useRouter();
  const [editing, setEditing] = useState<PriceListDetail["rules"][number] | "new" | null>(null);
  const [pending, start] = useTransition();
  const [deleting, setDeleting] = useState<string | null>(null);
  const rules = [...list.rules].sort((a, b) => RANK[a.appliesTo] - RANK[b.appliesTo] || b.minQuantity - a.minQuantity || b.createdAt.localeCompare(a.createdAt));
  const remove = (id: string) => start(async () => {
    const res = await deletePriceListRule(id);
    setDeleting(null);
    if ("error" in res) { toast.error(t(`error.${res.error.split(":")[0]}` as never)); return; }
    router.refresh();
  });
  return (
    <section className="space-y-2">
      <AlertModal isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove(deleting)} loading={pending} />
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{t("rules")}</h2>
        {canWrite && <Button size="sm" onClick={() => setEditing("new")}>{t("addRule")}</Button>}
      </div>
      <p className="text-xs text-muted-foreground">{t("rulesOrderHint")}</p>
      <Table>
        <TableHeader>
          <TableRow><TableHead>{t("appliesTo")}</TableHead><TableHead>{t("minQuantity")}</TableHead><TableHead>{t("validity")}</TableHead><TableHead>{t("price")}</TableHead><TableHead /></TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((r) => {
            const s = ruleSummary(r, (k, p) => t(k as never, p as never));
            return (
              <TableRow key={r.id}>
                <TableCell>{s.target}</TableCell>
                <TableCell>{r.minQuantity}</TableCell>
                <TableCell>{r.dateStart ?? "…"} – {r.dateEnd ?? "…"}</TableCell>
                <TableCell>{s.price}</TableCell>
                <TableCell className="text-right">
                  {canWrite && (<>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>{t("edit")}</Button>
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => setDeleting(r.id)}>{t("delete")}</Button>
                  </>)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {editing && (
        <RuleSheet priceListId={list.id} rule={editing === "new" ? null : editing} products={products} categories={categories} lists={lists}
          onClose={(saved) => { setEditing(null); if (saved) router.refresh(); }} />
      )}
    </section>
  );
}
