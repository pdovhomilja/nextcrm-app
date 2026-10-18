import type { OrderSlotProps } from "@nextcrm/plugin-sdk";
import { localTime, type Settings, type Secrets } from "../settings";
import { orderPanelData } from "./data";

export async function OrderPanel({ orderId, ctx }: OrderSlotProps<Settings, Secrets>) {
  const d = await orderPanelData(ctx, orderId);
  if (!d) return null;
  const l = d.link;
  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <div className="font-medium">OXO ERP</div>
      {l && (
        <>
          <a className="underline" href={l.url} target="_blank" rel="noreferrer">{ctx.t("order.linked", { number: l.number })}</a>
          {l.state === "missing" ? <div className="text-amber-600">{ctx.t("order.missing")}</div> : (
            <div className="text-muted-foreground">{ctx.t("order.state", { state: l.state })} · {ctx.t(`order.delivery.${l.delivery}`)}</div>
          )}
          {l.imported && <div className="text-muted-foreground">{ctx.t("order.imported")}</div>}
          {l.belowList.length > 0 && <div className="text-amber-600">{ctx.t("order.belowList", { lines: l.belowList.join(", ") })}</div>}
          {l.deliveries.length > 0 && (
            <div>
              <div className="font-medium">{ctx.t("order.deliveries")}</div>
              <ul className="text-xs">{l.deliveries.map((p) => <li key={p.number}>{p.number} · {p.state}{p.doneAt ? ` · ${p.doneAt.slice(0, 10)}` : ""}</li>)}</ul>
            </div>
          )}
        </>
      )}
      {d.waiting && (
        <div>
          <div>{ctx.t("order.waiting", { date: localTime(ctx, d.waiting.waitingSince) })}</div>
          <div className="text-xs text-muted-foreground">{ctx.t("order.lastError", { error: d.waiting.lastError })}</div>
        </div>
      )}
      {d.failed && <div className="text-destructive">{ctx.t("order.failed", { reason: d.failed.reason })}</div>}
    </div>
  );
}
