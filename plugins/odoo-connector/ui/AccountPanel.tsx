import type { AccountSlotProps } from "@nextcrm/plugin-sdk";
import { localTime, type Settings, type Secrets } from "../settings";
import { panelData } from "./data";

export async function AccountPanel({ accountId, ctx }: AccountSlotProps<Settings, Secrets>) {
  const d = await panelData(ctx, accountId);
  if (!d) return null;
  return (
    <div className="space-y-1 rounded-md border p-3 text-sm">
      <div className="font-medium">Odoo</div>
      <a className="underline" href={d.url} target="_blank" rel="noreferrer">{ctx.t("panel.linked", { id: d.partnerId })}</a>
      <div className="text-muted-foreground">{ctx.t("panel.synced", { date: localTime(ctx, d.syncedAt) })}</div>
      <div className="text-muted-foreground">{ctx.t("panel.fields")}</div>
      {d.priceList && <div>{ctx.t(d.priceList.imported ? "panel.priceList" : "panel.priceListMissing", { name: d.priceList.name })}</div>}
      {d.archived && <div className="text-destructive">{ctx.t("panel.archived")}</div>}
      {!d.archived && d.notCustomer && <div className="text-destructive">{ctx.t("panel.notCustomer")}</div>}
    </div>
  );
}
