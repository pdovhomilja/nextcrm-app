import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "../../../components/ui/Container";
import { getPriceList, getPriceLists } from "@/actions/crm/price-lists/queries";
import { requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { getEnabledCurrencies } from "@/lib/currency";
import { PriceListHeader } from "../components/PriceListHeader";
import { RulesTable } from "../components/RulesTable";
import { PriceCheckPanel } from "../components/PriceCheckPanel";

export default async function PriceListDetailPage(props: { params: Promise<{ priceListId: string }> }) {
  const { priceListId } = await props.params;
  const user = await requireAuthenticated();
  const list = await getPriceList(priceListId);
  if (!list) notFound();
  const t = await getTranslations("PriceListsPage");
  const [products, categories, lists, currencies] = await Promise.all([
    prismadb.crm_Products.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prismadb.crm_ProductCategories.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getPriceLists({ includeArchived: true }),
    getEnabledCurrencies(),
  ]);
  const canWrite = (user.role === "manager" || user.role === "admin") && list.source === "CRM";
  return (
    <Container title={list.name} description={t("detailDescription")}>
      <div className="space-y-6">
        <PriceListHeader list={list} canWrite={canWrite} currencies={currencies.map((c) => c.code)} />
        <RulesTable list={list} canWrite={canWrite} products={products} categories={categories} lists={lists.filter((l) => l.id !== list.id).map((l) => ({ id: l.id, name: l.name }))} />
        <PriceCheckPanel priceListId={list.id} products={products} />
      </div>
    </Container>
  );
}
