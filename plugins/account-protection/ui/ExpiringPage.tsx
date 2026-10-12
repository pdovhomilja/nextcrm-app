import type { PageProps } from "@nextcrm/plugin-sdk";
import type { Settings } from "../settings";
import { formatDay } from "../state";
import { dueWithin } from "./common";

async function rows(ctx: PageProps<Settings>["ctx"], items: { accountId: string; day: string }[]) {
  const out: { id: string; name: string; day: string }[] = [];
  for (const { accountId, day } of items) {
    const acc = await ctx.data.accounts.get(accountId);
    if (acc) out.push({ id: accountId, name: String(acc.name ?? accountId), day });
  }
  return out;
}

export async function ExpiringPage({ ctx }: PageProps<Settings>) {
  const due = await rows(ctx, await dueWithin(ctx, new Date()));
  const freed = await rows(ctx, (await ctx.store.list("freed:")).map((e) => ({ day: e.key.slice(6, 16), accountId: e.key.slice(17) })));
  const list = (items: { id: string; name: string; day: string }[]) =>
    items.length === 0 ? <p className="text-muted-foreground">{ctx.t("expiring.empty")}</p> : (
      <ul className="space-y-1">
        {items.map((r) => (
          <li key={`${r.id}-${r.day}`}><span className="mr-3 tabular-nums">{formatDay(r.day, ctx.locale)}</span><a className="underline" href={`/crm/accounts/${r.id}`}>{r.name}</a></li>
        ))}
      </ul>
    );
  return (
    <div className="space-y-6 text-sm">
      <h1 className="text-xl font-semibold">{ctx.t("expiring.title")}</h1>
      <section><h2 className="mb-2 font-medium">{ctx.t("expiring.due", { days: ctx.settings.warnDays })}</h2>{list(due)}</section>
      <section><h2 className="mb-2 font-medium">{ctx.t("expiring.freed")}</h2>{list(freed)}</section>
    </div>
  );
}
