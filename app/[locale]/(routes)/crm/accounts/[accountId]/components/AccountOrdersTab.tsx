import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getAccountOrders } from "@/actions/crm/orders/queries";
import { OrdersTable } from "../../../orders/components/OrdersTable";

export async function AccountOrdersTab({ accountId }: { accountId: string }) {
  const t = await getTranslations("OrdersPage");
  const rows = await getAccountOrders(accountId);
  return (
    <div className="space-y-3">
      <Link className="inline-block rounded-md border px-3 py-1 text-sm" href={`/crm/orders/new?accountId=${accountId}`}>{t("new")}</Link>
      <OrdersTable rows={rows} hideAccount />
    </div>
  );
}
