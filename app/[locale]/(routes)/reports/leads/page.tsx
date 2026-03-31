import { getTranslations } from "next-intl/server";
import { Card } from "@tremor/react";
import { ReportPageLayout } from "@/components/reports/ReportPageLayout";
import { ReportChart } from "@/components/reports/ReportChart";
import { ReportTable } from "@/components/reports/ReportTable";
import { parseSearchParamsToFilters } from "@/actions/reports/types";
import {
  getNewLeads,
  getLeadSources,
  getConversionRate,
  getNewContacts,
  getContactsByAccount,
} from "@/actions/reports/leads";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function LeadsReportPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams(
    Object.entries(resolvedParams).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );
  const filters = parseSearchParamsToFilters(params);
  const t = await getTranslations("ReportsPage");

  const [newLeads, leadSources, conversion, newContacts, contactsByAccount] =
    await Promise.all([
      getNewLeads(filters),
      getLeadSources(filters),
      getConversionRate(filters),
      getNewContacts(filters),
      getContactsByAccount(filters),
    ]);

  return (
    <ReportPageLayout
      title={t("leads.title")}
      description={t("leads.description")}
      category="leads"
      currentFilters={params.toString()}
    >
      <Card className="rounded-md p-4">
        <p className="text-sm text-muted-foreground">{t("leads.conversionRate")}</p>
        <p className="text-2xl font-bold mt-1">{conversion.rate}%</p>
        <p className="text-xs text-muted-foreground mt-1">
          {conversion.converted} / {conversion.leads} {t("leads.converted")}
        </p>
      </Card>
      <ReportChart data={newLeads} titleKey="newLeads" type="area" />
      <ReportChart data={leadSources} titleKey="leadSources" type="bar" />
      <ReportChart data={newContacts} titleKey="newContacts" type="area" />
      <ReportTable data={contactsByAccount} titleKey="contactsByAccount" />
    </ReportPageLayout>
  );
}
