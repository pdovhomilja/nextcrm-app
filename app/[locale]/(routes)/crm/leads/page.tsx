import { Suspense } from "react";

import CrmTableSkeleton from "@/components/skeletons/crm-table-skeleton";

import Container from "../../components/ui/Container";
import LeadsView from "../components/LeadsView";

import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getLeads } from "@/actions/crm/get-leads";
import { getTranslations } from "next-intl/server";

async function LeadsContent() {
  const [crmData, leads] = await Promise.all([
    getAllCrmData(),
    getLeads(),
  ]);
  return <LeadsView crmData={crmData} data={leads} />;
}

const LeadsPage = async () => {
  const t = await getTranslations("CrmPage");
  return (
    <Container
      title={t("leads.pageTitle")}
      description={t("leads.pageDescription")}
    >
      <Suspense fallback={<CrmTableSkeleton />}>
        <LeadsContent />
      </Suspense>
    </Container>
  );
};

export default LeadsPage;

