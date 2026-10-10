import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/authz";
import { getOrderSettings } from "./_actions/orders";
import { OrderSettingsForm } from "./_components/OrderSettingsForm";

export default async function OrdersAdminPage() {
  await requireRole(["admin"]);
  const t = await getTranslations("OrdersAdminPage");
  const settings = await getOrderSettings();
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <OrderSettingsForm initial={settings} />
    </div>
  );
}
