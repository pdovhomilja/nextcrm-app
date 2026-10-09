import { getTranslations } from "next-intl/server";
import Container from "../../components/ui/Container";
import { getPriceLists } from "@/actions/crm/price-lists/queries";
import { requireAuthenticated } from "@/lib/authz";
import { getEnabledCurrencies } from "@/lib/currency";
import { PriceListsTable } from "./components/PriceListsTable";
import { NewPriceListButton } from "./components/NewPriceListButton";

export default async function PriceListsPage(props: { searchParams: Promise<{ archived?: string }> }) {
  const t = await getTranslations("PriceListsPage");
  const user = await requireAuthenticated();
  const { archived } = await props.searchParams;
  const [lists, currencies] = await Promise.all([getPriceLists({ includeArchived: archived === "1" }), getEnabledCurrencies()]);
  const canWrite = user.role === "manager" || user.role === "admin";
  return (
    <Container title={t("title")} description={t("description")}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <a className="text-sm underline" href={archived === "1" ? "?" : "?archived=1"}>{archived === "1" ? t("hideArchived") : t("showArchived")}</a>
        {canWrite && <NewPriceListButton currencies={currencies.map((c) => c.code)} />}
      </div>
      <PriceListsTable rows={lists.map((l) => ({ ...l, updatedAt: l.updatedAt.toISOString() }))} />
    </Container>
  );
}
