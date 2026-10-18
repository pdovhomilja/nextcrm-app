import type { AdminSectionProps } from "@nextcrm/plugin-sdk";
import { localTime, type Settings, type Secrets } from "../settings";
import { K, type Conflict, type ReportRow, type RunSummary } from "../store";
import { summaryText } from "../sync";
import { catalogData, ordersData } from "./data";

function Rows({ title, rows }: { title: string; rows: ReportRow[] }) {
  if (!rows.length) return null;
  return (
    <div>
      <h4 className="font-medium">{title}</h4>
      <ul className="text-xs">{rows.map((r) => (
        <li key={r.customerId}>{r.name} (#{r.customerId}){r.accountId ? <> → <a className="underline" href={`/crm/accounts/${r.accountId}`}>{r.accountId.slice(0, 8)}</a></> : null}</li>
      ))}</ul>
    </div>
  );
}

export async function AdminSection({ ctx }: AdminSectionProps<Settings, Secrets>) {
  const last = await ctx.store.get<RunSummary>(K.lastRun);
  const report = await ctx.store.get<RunSummary>(K.report);
  const conflicts = (await ctx.store.list("conflict:")).map((e) => e.value as Conflict);
  const c = await catalogData(ctx);
  const o = await ordersData(ctx, new Date());
  const time = (iso: string) => localTime(ctx, iso);
  const next = last ? new Date(Date.parse(last.at) + ctx.settings.syncMinutes * 60_000) : null;
  return (
    <div className="space-y-3 rounded-md border p-4 text-sm">
      {ctx.settings.dryRun && <p className="font-medium text-amber-600">{ctx.t("admin.dryRun")}</p>}
      <p>{ctx.t("admin.lastRun")}: {last ? `${time(last.at)} · ${summaryText(ctx, last)}` : ctx.t("admin.never")}</p>
      {next && !ctx.settings.dryRun && <p>{ctx.t("admin.nextRun")}: {time(next.toISOString())}</p>}
      {last?.catalog && last.catalog.listsMissing.length > 0 && <p className="text-destructive">{ctx.t("admin.listsMissing", { ids: last.catalog.listsMissing.join(", ") })}</p>}
      {report && (
        <div className="space-y-1">
          <h3 className="font-medium">{ctx.t("admin.report", { date: time(report.at) })}</h3>
          <p>{summaryText(ctx, report)}</p>
          <Rows title={ctx.t("admin.nameLinks")} rows={report.rows.name} />
          <Rows title={ctx.t("admin.createdRows")} rows={report.rows.created} />
        </div>
      )}
      <div>
        <h3 className="mb-1 font-medium">{ctx.t("admin.conflicts")}</h3>
        {conflicts.length === 0 ? <p className="text-muted-foreground">{ctx.t("admin.conflictsEmpty")}</p> : (
          <>
            <p className="text-muted-foreground">{ctx.t("admin.conflictsHelp")}</p>
            <ul className="space-y-1">{conflicts.map((x) => (
              <li key={x.customerId}>
                {x.name} (#{x.customerId}) · {ctx.t(`admin.reason.${x.reason}`)} · {x.candidates.map((id, i) => <a key={id} className="underline" href={`/crm/accounts/${id}`}>{i ? ", " : ""}{id.slice(0, 8)}</a>)}
              </li>
            ))}</ul>
          </>
        )}
      </div>
      <div className="space-y-2">
        <h3 className="font-medium">{ctx.t("admin.catalog")}</h3>
        <p className="text-muted-foreground">{ctx.t("admin.priceListsHelp")}</p>
        {c.lists ? (
          <div>
            <p>{ctx.t("admin.listsLoadedAt", { date: time(c.loadedAt!) })}</p>
            <table className="mt-1 text-xs">
              <tbody>{c.lists.map((l) => (
                <tr key={l.id}><td className="pr-3">{l.chosen ? "✓" : ""}</td><td className="pr-3">{l.id}</td><td className="pr-3">{l.name}</td><td className="pr-3">{l.currency}</td><td>{l.rules}</td></tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="text-muted-foreground">{ctx.t("admin.listsNotLoaded")}</p>}
        {c.skipped.length > 0 && (
          <div>
            <h4 className="font-medium">{ctx.t("admin.skippedRules")}</h4>
            <ul className="text-xs">{c.skipped.map((s) => <li key={`${s.list}:${s.ruleId}`}>{s.list} · #{s.ruleId} · {s.reason}</li>)}</ul>
          </div>
        )}
        {c.queued && <p>{ctx.t("admin.syncQueued")}</p>}
      </div>
      <div className="space-y-2">
        <h3 className="font-medium">{ctx.t("admin.orders")}</h3>
        {!o.enabled ? <p className="text-muted-foreground">{ctx.t("admin.ordersOff")}</p> : <p>{ctx.t("admin.ordersCounts", { waiting: o.waiting, sent: o.sent, failed: o.failed.length })}</p>}
        {o.pending > 0 && <p>{ctx.t("admin.pending", { count: o.pending })}</p>}
        {o.paused && <p className="text-destructive">{ctx.t("admin.ordersPaused", { date: time(o.paused.at), reason: o.paused.reason })}</p>}
        {o.failed.length > 0 && (
          <ul className="text-xs">{o.failed.map((f) => <li key={f.orderId}><a className="underline" href={`/crm/orders/${f.orderId}`}>{f.number}</a> · {f.reason}</li>)}</ul>
        )}
      </div>
    </div>
  );
}
