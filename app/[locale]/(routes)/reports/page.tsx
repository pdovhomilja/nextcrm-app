import Container from "../components/ui/Container";
import { getDashboardKPIs } from "@/actions/reports/dashboard";
import { parseSearchParamsToFilters } from "@/actions/reports/types";
import { KPICard } from "@/components/reports/KPICard";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { getDefaultCurrency } from "@/lib/currency";

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
  const cookieStore = await cookies();
  const defaultCurrency = await getDefaultCurrency();
  const displayCurrency = cookieStore.get("display_currency")?.value || defaultCurrency;
  const kpis = await getDashboardKPIs(filters, displayCurrency);
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
            <KPICard key={kpi.label} kpi={kpi} dateParams={dateParams} displayCurrency={displayCurrency} />
          ))}
        </div>
      </div>
    </Container>
  );
}
