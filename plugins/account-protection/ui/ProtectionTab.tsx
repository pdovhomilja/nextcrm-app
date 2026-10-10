import type { AccountSlotProps } from "@nextcrm/plugin-sdk";
import type { Settings } from "../settings";
import { formatDay } from "../state";
import type { HistoryEntry } from "../store";
import { loadSummary, orderText, summaryText } from "./common";

export async function ProtectionTab({ accountId, ctx }: AccountSlotProps<Settings>) {
  const { summary, reg, contactAt } = await loadSummary(ctx, accountId);
  const history = (await ctx.store.list(`hist:${accountId}:`)).map((e) => e.value as HistoryEntry).reverse();
  const ids = Array.from(new Set(history.flatMap((h) => [h.from, h.to, h.byUserId]).filter((x): x is string => !!x)));
  const names = new Map<string, string>();
  for (const id of ids) {
    const u = await ctx.data.users.get(id);
    names.set(id, String(u?.name ?? u?.email ?? id));
  }
  const who = (id: string | null) => (id ? names.get(id) ?? id : ctx.t("tab.nobody"));
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">{ctx.t("tab.status")}</dt>
        <dd>{summaryText(ctx, summary)}</dd>
        {reg && (
          <>
            <dt className="text-muted-foreground">{ctx.t("tab.contact")}</dt>
            <dd>{contactAt ? ctx.t("tab.contactYes", { date: formatDay(contactAt, ctx.locale) }) : ctx.t("tab.contactNo")}</dd>
            {orderText(ctx, reg) && (
              <>
                <dt className="text-muted-foreground">{ctx.t("tab.order")}</dt>
                <dd>{orderText(ctx, reg)}</dd>
              </>
            )}
          </>
        )}
      </dl>
      <div>
        <h3 className="mb-2 font-medium">{ctx.t("tab.history")}</h3>
        {history.length === 0 ? (
          <p className="text-muted-foreground">{ctx.t("tab.historyEmpty")}</p>
        ) : (
          <table className="w-full">
            <tbody>
              {history.map((h) => (
                <tr key={h.at} className="border-t">
                  <td className="py-1 pr-4 whitespace-nowrap">{formatDay(h.at, ctx.locale)}</td>
                  <td className="py-1 pr-4">{who(h.from)} → {who(h.to)}</td>
                  <td className="py-1 pr-4">{h.byUserId ? who(h.byUserId) : ctx.t("tab.system")}</td>
                  <td className="py-1 text-muted-foreground">{ctx.t(`tab.reason.${h.reason}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
