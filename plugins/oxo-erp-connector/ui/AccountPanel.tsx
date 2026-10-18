import type { AccountSlotProps } from "@nextcrm/plugin-sdk";
import { localTime, type Settings, type Secrets } from "../settings";
import { panelData } from "./data";

export async function AccountPanel({ accountId, ctx }: AccountSlotProps<Settings, Secrets>) {
  const d = await panelData(ctx, accountId);
  if (!d) return null;
  return (
    <div className="space-y-1 rounded-md border p-3 text-sm">
      <div className="font-medium">OXO ERP</div>
      <div>{ctx.t("panel.linked", { id: d.customerId })}</div>
      <div className="text-muted-foreground">{ctx.t("panel.synced", { date: localTime(ctx, d.syncedAt) })}</div>
      <div className="text-muted-foreground">{ctx.t("panel.fields")}</div>
      {d.priceList && <div>{d.priceList.imported ? ctx.t("panel.priceList", { name: d.priceList.name ?? String(d.priceList.id) }) : ctx.t("panel.priceListMissing", { id: d.priceList.id })}</div>}
      {d.addresses.length > 0 && (
        <div>
          <div className="font-medium">{ctx.t("panel.addresses")}</div>
          <ul className="text-xs">{d.addresses.map((a) => <li key={a.id}>{a.text}</li>)}</ul>
        </div>
      )}
      {d.inactive && <div className="text-destructive">{ctx.t("panel.inactive")}</div>}
    </div>
  );
}
