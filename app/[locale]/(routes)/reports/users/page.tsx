import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { ReportPageLayout } from "@/components/reports/ReportPageLayout";
import { ReportChart } from "@/components/reports/ReportChart";
import { parseSearchParamsToFilters } from "@/actions/reports/types";
import {
  getActiveUsersByYear,
  getActiveUsersLifetime,
  getUserGrowth,
  getUsersByRole,
} from "@/actions/reports/users";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function UsersReportPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams(
    Object.entries(resolvedParams).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );
  const filters = parseSearchParamsToFilters(params);
  const t = await getTranslations("ReportsPage");

  const [activeByYear, totalActive, userGrowth, usersByRole] = await Promise.all([
    getActiveUsersByYear(),
    getActiveUsersLifetime(),
    getUserGrowth(filters),
    getUsersByRole(filters),
  ]);

  return (
    <ReportPageLayout
      title={t("users.title")}
      description={t("users.description")}
      category="users"
      currentFilters={params.toString()}
    >
      <Card><CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{t("users.totalActive")}</p>
        <p className="text-2xl font-bold mt-1">{totalActive.toLocaleString()}</p>
      </CardContent></Card>
      <ReportChart data={activeByYear} titleKey="activeByYear" type="bar" />
      <ReportChart data={userGrowth} titleKey="userGrowth" type="area" />
      <ReportChart data={usersByRole} titleKey="usersByRole" type="pie" />
    </ReportPageLayout>
  );
}
