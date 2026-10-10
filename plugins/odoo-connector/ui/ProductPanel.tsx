import type { ProductSlotProps } from "@nextcrm/plugin-sdk";
import type { Settings, Secrets } from "../settings";
import { productPanelData } from "./data";

export async function ProductPanel({ productId, ctx }: ProductSlotProps<Settings, Secrets>) {
  const d = await productPanelData(ctx, productId);
  if (!d) return null;
  return (
    <div className="space-y-1 rounded-md border p-3 text-sm">
      <div className="font-medium">Odoo</div>
      <a className="underline" href={d.url} target="_blank" rel="noreferrer">{ctx.t("product.linked", { id: d.odooId })}</a>
      {d.syncedAt && <div className="text-muted-foreground">{ctx.t("panel.synced", { date: d.syncedAt.slice(0, 16).replace("T", " ") })}</div>}
    </div>
  );
}
