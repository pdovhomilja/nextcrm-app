import type { OrderSlotProps } from "@nextcrm/plugin-sdk";
import { localTime, type Settings, type Secrets } from "../settings";
import { orderPanelData } from "./data";

export async function OrderPanel({ orderId, ctx }: OrderSlotProps<Settings, Secrets>) {
  const d = await orderPanelData(ctx, orderId);
  if (!d) return null;
  const l = d.link;
  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <div className="font-medium">Odoo</div>
      {l && (
        <>
          <a className="underline" href={l.url} target="_blank" rel="noreferrer">{ctx.t("order.linked", { name: l.name })}</a>
          {l.state === "missing" ? <div className="text-amber-600">{ctx.t("order.missing")}</div> : <div className="text-muted-foreground">{ctx.t("order.state", { state: l.state })}</div>}
          {l.imported && <div className="text-muted-foreground">{ctx.t("order.imported")}</div>}
          {l.movedNotified && <div className="text-amber-600">{ctx.t("order.moved")}</div>}
          {l.created.includes("customer") && <div>{ctx.t("order.createdCustomer")}</div>}
          {l.created.includes("delivery") && <div>{ctx.t("order.createdDelivery")}</div>}
          {l.priceDiffs.length > 0 && (
            <div>
              <div className="font-medium text-amber-600">{ctx.t("order.priceDiffs")}</div>
              <ul className="text-xs">{l.priceDiffs.map((p) => <li key={p.sku}>{ctx.t("order.priceDiff", { sku: p.sku, crm: p.crm, odoo: p.odoo })}</li>)}</ul>
            </div>
          )}
          {l.totalDiffers && l.total !== null && <div className="text-amber-600">{ctx.t("order.totalDiffers", { odoo: l.total })}</div>}
          {l.deliveries.length > 0 && (
            <div>
              <div className="font-medium">{ctx.t("order.deliveries")}</div>
              <ul className="text-xs">{l.deliveries.map((p) => <li key={p.name}>{p.name} · {p.state}{p.date ? ` · ${p.date.slice(0, 10)}` : ""}</li>)}</ul>
            </div>
          )}
          {l.invoices.length > 0 && (
            <div>
              <div className="font-medium">{ctx.t("order.invoices")}</div>
              <ul className="text-xs">{l.invoices.map((i) => (
                <li key={i.number}>{ctx.t("order.invoice", { number: i.number, due: i.due ?? "-", amount: i.amount, residual: i.residual, state: i.paymentState })}</li>
              ))}</ul>
            </div>
          )}
        </>
      )}
      {d.waiting && (
        <div>
          <div>{ctx.t("order.waiting", { date: localTime(ctx, d.waiting.waitingSince ?? new Date().toISOString()) })}</div>
          {d.waiting.lastError && <div className="text-xs text-muted-foreground">{ctx.t("order.lastError", { error: d.waiting.lastError })}</div>}
        </div>
      )}
      {d.failed && <div className="text-destructive">{ctx.t("order.failed", { reason: d.failed.reason })}</div>}
    </div>
  );
}
