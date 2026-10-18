import type { AccountSlotProps } from "@nextcrm/plugin-sdk";
import type { Settings, Secrets } from "../settings";
import { accountTabData } from "./data";

export async function AccountTab({ accountId, ctx }: AccountSlotProps<Settings, Secrets>) {
  const d = await accountTabData(ctx, accountId);
  if (!d) return <p className="text-sm text-muted-foreground">{ctx.t("tab.notLinked")}</p>;
  return (
    <div className="space-y-2 text-sm">
      <h3 className="font-medium">{ctx.t("tab.orders")}</h3>
      {d.orders.length === 0 ? <p className="text-muted-foreground">{ctx.t("tab.ordersEmpty")}</p> : (
        <table className="w-full text-xs [&_td]:pr-3 [&_th]:pr-3">
          <thead><tr className="text-left"><th>{ctx.t("tab.number")}</th><th>{ctx.t("tab.oxo")}</th><th>{ctx.t("tab.date")}</th><th className="text-right">{ctx.t("tab.total")}</th><th>{ctx.t("tab.status")}</th><th>{ctx.t("tab.delivery")}</th></tr></thead>
          <tbody>{d.orders.map((o) => (
            <tr key={o.orderId}><td><a className="underline" href={`/crm/orders/${o.orderId}`}>{o.number}</a></td><td>{o.oxoNumber}</td><td>{o.date}</td><td className="text-right">{o.total.toFixed(2)} {o.currency}</td><td>{o.status}</td><td>{ctx.t(`order.delivery.${o.delivery}`)}</td></tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}
