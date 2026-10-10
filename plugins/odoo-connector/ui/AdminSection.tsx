import type { AdminSectionProps } from "@nextcrm/plugin-sdk";
import type { Settings, Secrets } from "../settings";
import { K, type Conflict, type RunSummary } from "../store";
import { summaryText } from "../sync";

export async function AdminSection({ ctx }: AdminSectionProps<Settings, Secrets>) {
  const last = await ctx.store.get<RunSummary>(K.lastRun);
  const conflicts = (await ctx.store.list("conflict:")).map((e) => e.value as Conflict);
  const next = last ? new Date(Date.parse(last.at) + ctx.settings.syncMinutes * 60_000) : null;
  return (
    <div className="space-y-3 rounded-md border p-4 text-sm">
      {ctx.settings.dryRun && <p className="font-medium text-amber-600">{ctx.t("admin.dryRun")}</p>}
      <p>{ctx.t("admin.lastRun")}: {last ? `${last.at.slice(0, 16).replace("T", " ")} · ${summaryText(ctx, last)}` : ctx.t("admin.never")}</p>
      {next && <p>{ctx.t("admin.nextRun")}: {next.toISOString().slice(0, 16).replace("T", " ")}</p>}
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
    </div>
  );
}
