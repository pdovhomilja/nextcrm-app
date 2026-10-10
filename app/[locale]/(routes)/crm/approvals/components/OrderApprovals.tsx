import { getTranslations } from "next-intl/server";
import { getPendingOrderApprovals } from "@/actions/crm/orders/queries";
import { OrdersTable } from "../../orders/components/OrdersTable";

export async function OrderApprovals() {
  const t = await getTranslations("OrdersPage");
  const rows = await getPendingOrderApprovals();
  return (
    <section className="mt-8 space-y-2">
      <h2 className="text-lg font-medium">{t("approvalsTitle")}</h2>
      {rows.length ? <OrdersTable rows={rows} /> : <p className="text-sm text-muted-foreground">{t("noApprovals")}</p>}
    </section>
  );
}
