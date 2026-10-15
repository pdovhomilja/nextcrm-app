import { Suspense } from "react";

import CrmTableSkeleton from "@/components/skeletons/crm-table-skeleton";

import Container from "../../components/ui/Container";
import OpportunitiesView from "../components/OpportunitiesView";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getOpportunitiesFull } from "@/actions/crm/get-opportunities-with-includes";
import { getTranslations } from "next-intl/server";
import { serializeDecimalsList } from "@/lib/serialize-decimals";

async function OpportunitiesContent() {
  const [crmData, rawOpportunities] = await Promise.all([
    getAllCrmData(),
    getOpportunitiesFull(),
  ]);
  const opportunities = serializeDecimalsList(rawOpportunities);
  return <OpportunitiesView crmData={crmData} data={opportunities} />;
}

const OpportunitiesPage = async () => {
  const t = await getTranslations("CrmPage");
  return (
    <Container
      title={t("opportunities.pageTitle")}
      description={t("opportunities.pageDescription")}
    >
      <Suspense fallback={<CrmTableSkeleton />}>
        <OpportunitiesContent />
      </Suspense>
    </Container>
  );
};

export default OpportunitiesPage;

