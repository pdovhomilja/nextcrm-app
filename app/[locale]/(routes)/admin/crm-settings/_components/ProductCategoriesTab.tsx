"use client";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listProductCategories, saveProductCategory } from "../_actions/product-categories";
import { categoryOptionsFor } from "./category-tree";

type Cat = Awaited<ReturnType<typeof listProductCategories>>[number];
const NONE = "__none__";

export function ProductCategoriesTab() {
  const t = useTranslations("AdminPage");
  const [cats, setCats] = useState<Cat[]>([]);
  const [newName, setNewName] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => {
    let alive = true;
    listProductCategories().then((rows) => { if (alive) setCats(rows); });
    return () => { alive = false; };
  }, []);
  const save = (input: { id?: string; name: string; parentId: string | null; isActive: boolean }) => start(async () => {
    const res = await saveProductCategory(input);
    if ("error" in res) { toast.error(res.error === "external" ? t("categoryExternal") : res.error === "externalParent" ? t("categoryExternalParent") : res.error === "cycle" ? t("categoryCycle") : res.error); return; }
    setCats(await listProductCategories());
  });
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input className="max-w-xs" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("productCategories")} />
        <Button disabled={pending || !newName.trim()} onClick={() => { save({ name: newName, parentId: null, isActive: true }); setNewName(""); }}>+</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>{t("productCategories")}</TableHead><TableHead>{t("parentCategory")}</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {cats.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.name} <span className="text-xs text-muted-foreground">({c.productCount})</span>{c.source === "EXTERNAL" && <span className="ml-2 text-xs text-muted-foreground">{t("categoryExternal")}</span>}</TableCell>
              <TableCell>
                <Select disabled={c.source === "EXTERNAL"} value={c.parentId ?? NONE} onValueChange={(v) => save({ id: c.id, name: c.name, parentId: v === NONE ? null : v, isActive: c.isActive })}>
                  <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("noParent")}</SelectItem>
                    {categoryOptionsFor(c.id, cats).filter((o) => cats.find((x) => x.id === o.id)?.source !== "EXTERNAL").map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell><Switch disabled={c.source === "EXTERNAL"} checked={c.isActive} onCheckedChange={(v) => save({ id: c.id, name: c.name, parentId: c.parentId, isActive: v })} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
