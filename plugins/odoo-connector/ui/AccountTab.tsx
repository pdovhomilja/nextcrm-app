import type { AccountSlotProps } from "@nextcrm/plugin-sdk";
import { localTime, type Settings, type Secrets } from "../settings";
import { accountTabData } from "./data";

export async function AccountTab({ accountId, ctx }: AccountSlotProps<Settings, Secrets>) {
  const d = await accountTabData(ctx, accountId, new Date());
  if (!d) return <p className="text-sm text-muted-foreground">{ctx.t("tab.notLinked")}</p>;
  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted-foreground">{d.at ? ctx.t("tab.asOf", { date: localTime(ctx, d.at) }) : ctx.t("tab.notYet")}</p>
      <section>
        <h3 className="mb-1 font-medium">{ctx.t("tab.orders")}</h3>
        {d.orders.length === 0 ? <p className="text-muted-foreground">{ctx.t("tab.ordersEmpty")}</p> : (
          <table className="w-full text-xs [&_td]:pr-3 [&_th]:pr-3">
            <thead><tr className="text-left"><th>{ctx.t("tab.number")}</th><th>{ctx.t("tab.odoo")}</th><th>{ctx.t("tab.date")}</th><th className="text-right">{ctx.t("tab.total")}</th><th>{ctx.t("tab.status")}</th></tr></thead>
            <tbody>{d.orders.map((o) => (
              <tr key={o.orderId}><td><a className="underline" href={`/crm/orders/${o.orderId}`}>{o.number}</a></td><td>{o.odooName}</td><td>{o.date}</td><td className="text-right">{o.total.toFixed(2)} {o.currency}</td><td>{o.status}</td></tr>
            ))}</tbody>
          </table>
        )}
        <a className="text-xs underline" href={d.url} target="_blank" rel="noreferrer">{ctx.t("tab.allOrders")}</a>
      </section>
      <section>
        <h3 className="mb-1 font-medium">{ctx.t("tab.invoices")}</h3>
        {d.invoices.length === 0 ? <p className="text-muted-foreground">{ctx.t("tab.invoicesEmpty")}</p> : (
          <>
            <p className="font-medium">{ctx.t("tab.owed", { amounts: d.owed.map((x) => `${x.amount.toFixed(2)} ${x.currency}`).join(", ") })}</p>
            <table className="w-full text-xs [&_td]:pr-3 [&_th]:pr-3">
              <thead><tr className="text-left"><th>{ctx.t("tab.number")}</th><th>{ctx.t("tab.date")}</th><th>{ctx.t("tab.due")}</th><th className="text-right">{ctx.t("tab.total")}</th><th className="text-right">{ctx.t("tab.left")}</th></tr></thead>
              <tbody>{d.invoices.map((i) => (
                <tr key={i.number} className={i.overdueDays > 0 ? "text-destructive" : ""}>
                  <td>{i.number}</td><td>{i.date ?? "-"}</td><td>{i.due ?? "-"}{i.overdueDays > 0 ? ` · ${ctx.t("tab.overdue", { days: i.overdueDays })}` : ""}</td>
                  <td className="text-right">{(i.sign * i.amount).toFixed(2)} {i.currency}</td><td className="text-right">{(i.sign * i.residual).toFixed(2)} {i.currency}</td>
                </tr>
              ))}</tbody>
            </table>
          </>
        )}
      </section>
      <section>
        <h3 className="mb-1 font-medium">{ctx.t("tab.totals")}</h3>
        {d.totals.length === 0 ? <p className="text-muted-foreground">-</p> : (
          <ul className="text-xs">{d.totals.map((t) => <li key={`${t.year}-${t.currency}`}>{ctx.t("tab.year", { year: t.year, amount: t.amount.toFixed(2), currency: t.currency })}</li>)}</ul>
        )}
      </section>
    </div>
  );
}
