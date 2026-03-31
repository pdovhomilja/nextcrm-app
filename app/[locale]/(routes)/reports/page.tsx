import Container from "../components/ui/Container";
import { getDashboardKPIs } from "@/actions/reports/dashboard";
import { parseSearchParamsToFilters } from "@/actions/reports/types";
import { KPICard } from "@/components/reports/KPICard";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function ReportsPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams(
    Object.entries(resolvedParams).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );
  const filters = parseSearchParamsToFilters(params);
  const kpis = await getDashboardKPIs(filters);
  const t = await getTranslations("ReportsPage");
  const dateParams = params.toString();

  return (
    <Container title={t("title")} description={t("description")}>
      <div className="space-y-6 pt-4">
        <Suspense>
          <DateRangePicker />
        </Suspense>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {kpis.map((kpi) => (
            <KPICard key={kpi.label} kpi={kpi} dateParams={dateParams} />
          ))}
        </div>
      </div>
    </Container>
  );
}
