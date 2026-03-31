import { getTranslations } from "next-intl/server";
import { ReportPageLayout } from "@/components/reports/ReportPageLayout";
import { ReportChart } from "@/components/reports/ReportChart";
import { ReportTable } from "@/components/reports/ReportTable";
import { parseSearchParamsToFilters } from "@/actions/reports/types";
import {
  getNewAccounts,
  getAccountsByIndustry,
  getTopAccountsByRevenue,
  getAccountsBySize,
} from "@/actions/reports/accounts";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function AccountsReportPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams(
    Object.entries(resolvedParams).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );
  const filters = parseSearchParamsToFilters(params);
  const t = await getTranslations("ReportsPage");

  const [newAccounts, byIndustry, topByRevenue, bySize] = await Promise.all([
    getNewAccounts(filters),
    getAccountsByIndustry(filters),
    getTopAccountsByRevenue(filters),
    getAccountsBySize(filters),
  ]);

  return (
    <ReportPageLayout
      title={t("accounts.title")}
      description={t("accounts.description")}
      category="accounts"
      currentFilters={params.toString()}
    >
      <ReportChart data={newAccounts} titleKey="newAccounts" type="area" />
      <ReportChart data={byIndustry} titleKey="byIndustry" type="bar" />
      <ReportTable data={topByRevenue} titleKey="topByRevenue" />
      <ReportChart data={bySize} titleKey="bySize" type="bar" />
    </ReportPageLayout>
  );
}
