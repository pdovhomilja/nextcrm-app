import type { ProductSlotProps } from "@nextcrm/plugin-sdk";
import type { Settings, Secrets } from "../settings";
import { productPanelData } from "./data";

export async function ProductPanel({ productId, ctx }: ProductSlotProps<Settings, Secrets>) {
  const d = await productPanelData(ctx, productId);
  if (!d) return null;
  return (
    <div className="space-y-1 rounded-md border p-3 text-sm">
      <div className="font-medium">OXO ERP</div>
      <div>{ctx.t("product.linked", { id: d.oxoId })}</div>
    </div>
  );
}
