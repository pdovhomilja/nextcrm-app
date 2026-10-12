"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createOrder, quoteLine, submitOrder, updateOrder } from "@/actions/crm/orders/orders";
import type { ProductOption } from "@/actions/crm/orders/queries";
import { editorTotals, lineIsBelow, lineTotal, toLineInputs, type EditorLine } from "./editor-state";

type Header = {
  contactId: string | null; shipping_street: string | null; shipping_city: string | null; shipping_state: string | null;
  shipping_postal_code: string | null; shipping_country: string | null; requestedDeliveryDate: string | null; note: string | null;
};
type Props = {
  mode: "new" | "edit";
  accountId: string;
  orderId?: string;
  currency: string;
  priceListName: string | null;
  contacts: { id: string; name: string }[];
  products: ProductOption[];
  header: Header;
  lines: EditorLine[];
  canSubmit?: boolean;
};

const ADDRESS: [keyof Header, string][] = [["shipping_street", "street"], ["shipping_city", "city"], ["shipping_state", "state"], ["shipping_postal_code", "postalCode"], ["shipping_country", "country"]];
let seq = 0;
const newKey = () => `n${++seq}`;

export function OrderEditor(props: Props) {
  const t = useTranslations("OrdersPage");
  const router = useRouter();
  const [header, setHeader] = useState<Header>(props.header);
  const [rows, setRows] = useState<EditorLine[]>(props.lines);
  const [pending, start] = useTransition();
  const totals = editorTotals(rows);
  const fail = (e: string) => toast.error(/^(pricing|rule):/.test(e) ? e.slice(e.indexOf(":") + 1) : t(`error.${e}` as never));
  const set = (k: keyof Header, v: string) => setHeader((h) => ({ ...h, [k]: v || null }));
  const patch = (key: string, p: Partial<EditorLine>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const quote = (key: string, productId: string, quantity: string) => start(async () => {
    const res = await quoteLine({ productId, quantity, ...(props.orderId ? { orderId: props.orderId } : { accountId: props.accountId }) });
    if ("error" in res) { fail(res.error); return; }
    patch(key, { productId, productName: res.data.productName, listPrice: res.data.listPrice, vatRate: res.data.vatRate });
  });

  const save = (andSubmit = false) => start(async () => {
    const input = { ...header, lines: toLineInputs(rows) };
    const res = props.mode === "new" ? await createOrder({ accountId: props.accountId, ...input }) : await updateOrder(props.orderId!, input);
    if ("error" in res) { fail(res.error); return; }
    if (andSubmit) {
      const sub = await submitOrder(props.orderId!);
      if ("error" in sub) { fail(sub.error); router.refresh(); return; }
    }
    toast.success(t("saved"));
    if (props.mode === "new") router.push(`/crm/orders/${res.data.id}`);
    else router.refresh();
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3 text-sm">
        <div>{t("priceList")}: <b>{props.priceListName ?? t("noPriceList")}</b></div>
        <div>{t("currency")}: <b>{props.currency}</b></div>
        <label className="space-y-1">
          <span>{t("contact")}</span>
          <Select value={header.contactId ?? "__none__"} onValueChange={(v) => setHeader((h) => ({ ...h, contactId: v === "__none__" ? null : v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("noContact")}</SelectItem>
              {props.contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
      </div>

      <fieldset className="grid gap-3 md:grid-cols-5">
        <legend className="mb-2 text-sm font-medium">{t("delivery")}</legend>
        {ADDRESS.map(([k, label]) => (
          <Input key={k} placeholder={t(label as never)} aria-label={t(label as never)} value={header[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
        ))}
      </fieldset>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm"><span>{t("requestedDelivery")}</span>
          <Input type="date" value={header.requestedDeliveryDate ?? ""} onChange={(e) => set("requestedDeliveryDate", e.target.value)} />
        </label>
        <label className="space-y-1 text-sm"><span>{t("note")}</span>
          <Textarea value={header.note ?? ""} onChange={(e) => set("note", e.target.value)} />
        </label>
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">{t("lines")}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("product")}</TableHead><TableHead>{t("quantity")}</TableHead><TableHead>{t("listPrice")}</TableHead>
              <TableHead>{t("unitPrice")}</TableHead><TableHead>{t("vat")}</TableHead><TableHead className="text-right">{t("lineTotal")}</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell className="min-w-56">
                  <Select value={r.productId || undefined} onValueChange={(v) => quote(r.key, v, r.quantity)}>
                    <SelectTrigger><SelectValue placeholder={t("chooseProduct")} /></SelectTrigger>
                    <SelectContent>{props.products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ""}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Input className="w-24" inputMode="decimal" value={r.quantity}
                  onChange={(e) => patch(r.key, { quantity: e.target.value })}
                  onBlur={() => r.productId && quote(r.key, r.productId, r.quantity)} /></TableCell>
                <TableCell>{r.listPrice}</TableCell>
                <TableCell className="space-y-1">
                  <Input className="w-28" inputMode="decimal" placeholder={r.listPrice} value={r.unitPrice} onChange={(e) => patch(r.key, { unitPrice: e.target.value })} />
                  {r.unitPrice !== "" && <button type="button" className="text-xs underline" onClick={() => patch(r.key, { unitPrice: "" })}>{t("followList")}</button>}
                  {r.productId && lineIsBelow(r) && <Badge variant="destructive">{t("belowList")}</Badge>}
                </TableCell>
                <TableCell>{r.vatRate}</TableCell>
                <TableCell className="text-right">{r.productId ? lineTotal(r) : ""}</TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>{t("removeLine")}</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button size="sm" variant="outline" onClick={() => setRows((rs) => [...rs, { key: newKey(), productId: "", productName: "", quantity: "1", listPrice: "", unitPrice: "", vatRate: "0.00" }])}>{t("addLine")}</Button>
      </section>

      <div className="ml-auto w-64 space-y-1 text-sm">
        <div className="flex justify-between"><span>{t("subtotal")}</span><span>{totals.subtotal} {props.currency}</span></div>
        <div className="flex justify-between"><span>{t("vatTotal")}</span><span>{totals.vatTotal} {props.currency}</span></div>
        <div className="flex justify-between font-semibold"><span>{t("grandTotal")}</span><span>{totals.grandTotal} {props.currency}</span></div>
      </div>

      <div className="flex gap-2">
        <Button disabled={pending} variant={props.mode === "edit" ? "outline" : "default"} onClick={() => save()}>{props.mode === "new" ? t("create") : t("save")}</Button>
        {props.mode === "edit" && props.canSubmit && <Button disabled={pending} onClick={() => save(true)}>{t("submit")}</Button>}
      </div>
    </div>
  );
}
