import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { ReportPageLayout } from "@/components/reports/ReportPageLayout";
import { ReportChart } from "@/components/reports/ReportChart";
import { parseSearchParamsToFilters } from "@/actions/reports/types";
import {
  getCampaignPerformance,
  getCampaignROI,
  getTopTemplates,
  getTargetListGrowth,
} from "@/actions/reports/campaigns";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function CampaignsReportPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams(
    Object.entries(resolvedParams).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );
  const filters = parseSearchParamsToFilters(params);
  const t = await getTranslations("ReportsPage");

  const [performance, campaignROI, topTemplates, targetGrowth] = await Promise.all([
    getCampaignPerformance(filters),
    getCampaignROI(filters),
    getTopTemplates(filters),
    getTargetListGrowth(filters),
  ]);

  return (
    <ReportPageLayout
      title={t("campaigns.title")}
      description={t("campaigns.description")}
      category="campaigns"
      currentFilters={params.toString()}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">{t("campaigns.sent")}</p>
          <p className="text-2xl font-bold mt-1">{performance.sent.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">{t("campaigns.openRate")}</p>
          <p className="text-2xl font-bold mt-1">{performance.openRate}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">{t("campaigns.clickRate")}</p>
          <p className="text-2xl font-bold mt-1">{performance.clickRate}%</p>
        </CardContent></Card>
      </div>
      <ReportChart data={campaignROI} titleKey="campaignROI" type="bar" />
      <ReportChart data={topTemplates} titleKey="topTemplates" type="bar" layout="horizontal" />
      <ReportChart data={targetGrowth} titleKey="targetGrowth" type="area" />
    </ReportPageLayout>
  );
}
