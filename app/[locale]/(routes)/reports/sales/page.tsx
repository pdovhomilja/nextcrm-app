import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { getDefaultCurrency, formatCurrency as formatCurrencyUtil } from "@/lib/currency";
import { Decimal } from "@prisma/client/runtime/client";
import { Card, CardContent } from "@/components/ui/card";
import { ReportPageLayout } from "@/components/reports/ReportPageLayout";
import { ReportChart } from "@/components/reports/ReportChart";
import { parseSearchParamsToFilters } from "@/actions/reports/types";
import {
  getRevenue,
  getPipelineValue,
  getOppsByStage,
  getOppsByMonth,
  getWinLossRate,
  getAvgDealSize,
  getSalesCycleLength,
} from "@/actions/reports/sales";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function SalesReportPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams(
    Object.entries(resolvedParams).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );
  const filters = parseSearchParamsToFilters(params);
  const t = await getTranslations("ReportsPage");

  const cookieStore = await cookies();
  const defaultCurrency = await getDefaultCurrency();
  const displayCurrency = cookieStore.get("display_currency")?.value || defaultCurrency;

  const [revenue, pipeline, oppsByStage, oppsByMonth, winLoss, avgDeal, cycleLength] =
    await Promise.all([
      getRevenue(filters, displayCurrency),
      getPipelineValue(filters, displayCurrency),
      getOppsByStage(filters),
      getOppsByMonth(filters),
      getWinLossRate(filters),
      getAvgDealSize(filters, displayCurrency),
      getSalesCycleLength(filters),
    ]);

  return (
    <ReportPageLayout
      title={t("sales.title")}
      description={t("sales.description")}
      category="sales"
      currentFilters={params.toString()}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">{t("sales.revenue")}</p>
          <p className="text-2xl font-bold mt-1">{formatCurrencyUtil(new Decimal(revenue), displayCurrency)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">{t("sales.pipeline")}</p>
          <p className="text-2xl font-bold mt-1">{formatCurrencyUtil(new Decimal(pipeline), displayCurrency)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">{t("sales.avgDeal")}</p>
          <p className="text-2xl font-bold mt-1">{formatCurrencyUtil(new Decimal(avgDeal), displayCurrency)}</p>
        </CardContent></Card>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">{t("sales.winRate")}</p>
          <p className="text-2xl font-bold mt-1">{winLoss.rate}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">{t("sales.cycleLength")}</p>
          <p className="text-2xl font-bold mt-1">{cycleLength} {t("sales.days")}</p>
        </CardContent></Card>
      </div>
      <ReportChart data={oppsByStage} titleKey="oppsByStage" type="bar" />
      <ReportChart data={oppsByMonth} titleKey="oppsByMonth" type="area" />
    </ReportPageLayout>
  );
}
