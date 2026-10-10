"use client";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OrderDetail } from "@/actions/crm/orders/queries";

export function OrderView({ order }: { order: OrderDetail }) {
  const t = useTranslations("OrdersPage");
  const address = [order.shipping_street, order.shipping_postal_code, order.shipping_city, order.shipping_state, order.shipping_country].filter(Boolean).join(", ");
  return (
    <div className="space-y-4 text-sm">
      {order.source === "EXTERNAL" && <p className="text-muted-foreground">{t("external")}</p>}
      <div className="grid gap-2 md:grid-cols-3">
        <div>{t("priceList")}: <b>{order.priceListName ?? t("noPriceList")}</b></div>
        <div>{t("delivery")}: {address || "—"}</div>
        <div>{t("requestedDelivery")}: {order.requestedDeliveryDate ?? "—"}</div>
      </div>
      {order.note && <p>{t("note")}: {order.note}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("product")}</TableHead><TableHead>{t("quantity")}</TableHead><TableHead>{t("listPrice")}</TableHead>
            <TableHead>{t("unitPrice")}</TableHead><TableHead>{t("vat")}</TableHead><TableHead className="text-right">{t("lineTotal")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.lines.map((l) => (
            <TableRow key={l.id}>
              <TableCell>{l.productName}{l.sku ? ` (${l.sku})` : ""}</TableCell>
              <TableCell>{l.quantity} {l.unit ?? ""}</TableCell>
              <TableCell>{l.listPrice}</TableCell>
              <TableCell>{l.unitPrice} {l.belowList && <Badge variant="destructive">{t("belowList")} −{l.discountPercent} %</Badge>}</TableCell>
              <TableCell>{l.vatRate}</TableCell>
              <TableCell className="text-right">{l.lineTotal}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {order.belowListTotal !== "0.00" && <p className="text-destructive">{t("belowListTotal", { amount: `${order.belowListTotal} ${order.currency}` })}</p>}
      <div className="ml-auto w-64 space-y-1">
        <div className="flex justify-between"><span>{t("subtotal")}</span><span>{order.subtotal} {order.currency}</span></div>
        <div className="flex justify-between"><span>{t("vatTotal")}</span><span>{order.vatTotal} {order.currency}</span></div>
        <div className="flex justify-between font-semibold"><span>{t("grandTotal")}</span><span>{order.grandTotal} {order.currency}</span></div>
      </div>
    </div>
  );
}
