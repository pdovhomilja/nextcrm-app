import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/authz";
import { getPriceListOptions } from "@/actions/crm/price-lists/queries";
import { getDefaultPriceListId } from "./_actions/pricing";
import { DefaultPriceListForm } from "./_components/DefaultPriceListForm";

export default async function PricingAdminPage() {
  await requireRole(["admin"]);
  const t = await getTranslations("AdminPage");
  const [lists, current] = await Promise.all([getPriceListOptions(), getDefaultPriceListId()]);
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">{t("pricingTitle")}</h1>
      <DefaultPriceListForm lists={lists} current={current} />
    </div>
  );
}
