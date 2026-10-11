import type { AdminSectionProps } from "@nextcrm/plugin-sdk";
import { localTime, type Settings, type Secrets } from "../settings";
import { K, type Conflict, type RunSummary } from "../store";
import { summaryText } from "../sync";
import { catalogData, ordersData } from "./data";

export async function AdminSection({ ctx }: AdminSectionProps<Settings, Secrets>) {
  const last = await ctx.store.get<RunSummary>(K.lastRun);
  const conflicts = (await ctx.store.list("conflict:")).map((e) => e.value as Conflict);
  const c = await catalogData(ctx);
  const o = await ordersData(ctx, new Date());
  const time = (iso: string) => localTime(ctx, iso);
  const next = last ? new Date(Date.parse(last.at) + ctx.settings.syncMinutes * 60_000) : null;
  return (
    <div className="space-y-3 rounded-md border p-4 text-sm">
      {ctx.settings.dryRun && <p className="font-medium text-amber-600">{ctx.t("admin.dryRun")}</p>}
      <p>{ctx.t("admin.lastRun")}: {last ? `${time(last.at)} · ${summaryText(ctx, last)}` : ctx.t("admin.never")}</p>
      {next && <p>{ctx.t("admin.nextRun")}: {time(next.toISOString())}</p>}
      <div>
        <h3 className="mb-1 font-medium">{ctx.t("admin.conflicts")}</h3>
        {conflicts.length === 0 ? <p className="text-muted-foreground">{ctx.t("admin.conflictsEmpty")}</p> : (
          <ul className="space-y-1">{conflicts.map((c) => (
            <li key={c.partnerId}>
              {c.name} (#{c.partnerId}) · {ctx.t(`admin.reason.${c.reason}`)} · {c.candidates.map((id, i) => <a key={id} className="underline" href={`/crm/accounts/${id}`}>{i ? ", " : ""}{id.slice(0, 8)}</a>)}
            </li>
          ))}</ul>
        )}
      </div>
      <div className="space-y-2">
        <h3 className="font-medium">{ctx.t("admin.catalog")}</h3>
        {last?.catalog && <p>{ctx.t("admin.catalogCounts", { ...last.catalog, listsMissing: last.catalog.listsMissing.join(", ") })}</p>}
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
        {c.queued.sync && <p>{ctx.t("admin.syncQueued")}</p>}
        {c.queued.compare && <p>{ctx.t("admin.compareQueued")}</p>}
        {c.progress && c.progress.done < c.progress.total && <p>{ctx.t("admin.compareProgress", c.progress)}</p>}
        {c.compare && (
          <div>
            <p>{ctx.t("admin.compareResult", { date: time(c.compare.at) })}</p>
            {!c.compare.ok ? <p className="text-destructive">{ctx.t("admin.compareFailed", { error: c.compare.error ?? "?" })}</p> : (
              <>
                <ul className="text-xs">{c.compare.lists.map((l) => <li key={l.odooId}>{l.name}: {l.checked - l.failed}/{l.checked}</li>)}</ul>
                {c.compare.mismatches.length === 0 ? <p>{ctx.t("admin.compareClean")}</p> : (
                  <table className="mt-1 text-xs">
                    <tbody>{c.compare.mismatches.map((m, i) => (
                      <tr key={i}><td className="pr-3">{m.list}</td><td className="pr-3">{m.product}</td><td className="pr-3">{m.quantity}</td><td className="pr-3">{m.crm}</td><td className="pr-3">{m.odoo}</td><td className="pr-3">{m.diff}</td><td>{ctx.t(`admin.reason.${m.reason}`)}</td></tr>
                    ))}</tbody>
                  </table>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <h3 className="font-medium">{ctx.t("admin.orders")}</h3>
        {!o.enabled ? <p className="text-muted-foreground">{ctx.t("admin.ordersOff")}</p> : <p>{ctx.t("admin.ordersCounts", { waiting: o.waiting, sent: o.sent, failed: o.failed.length })}</p>}
        <p>{ctx.t("admin.importedCounts", { total: o.imported.total, last: o.imported.lastRun })}</p>
        {o.imported.failed.length > 0 && (
          <div>
            <h4 className="font-medium">{ctx.t("admin.importFailed")}</h4>
            <ul className="text-xs">{o.imported.failed.map((f) => <li key={f.odooId}>{f.name} · {f.reason}</li>)}</ul>
          </div>
        )}
        {o.paused && <p className="text-destructive">{ctx.t("admin.ordersPaused", { date: time(o.paused.at), reason: o.paused.reason })}</p>}
        {o.failed.length > 0 && (
          <ul className="text-xs">{o.failed.map((f) => <li key={f.orderId}><a className="underline" href={`/crm/orders/${f.orderId}`}>{f.number}</a> · {f.reason}</li>)}</ul>
        )}
        {o.created.length > 0 && (
          <div>
            <h4 className="font-medium">{ctx.t("admin.ordersCreated")}</h4>
            <ul className="text-xs">{o.created.map((c) => <li key={`${c.kind}:${c.odooId}`}>{time(c.at)} · {ctx.t(`admin.createdKind.${c.kind}`)} · {c.name} (#{c.odooId}) · {c.orderNumber}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
}
