import React, { Suspense } from "react";
import Container from "../../components/ui/Container";
import CrmTableSkeleton from "@/components/skeletons/crm-table-skeleton";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getContractsWithIncludes } from "@/actions/crm/get-contracts";
import ContractsView from "../components/ContractsView";
import { getTranslations } from "next-intl/server";
import { serializeDecimalsList } from "@/lib/serialize-decimals";

async function ContractsContent() {
  const [crmData, rawContracts] = await Promise.all([
    getAllCrmData(),
    getContractsWithIncludes(),
  ]);
  const contracts = serializeDecimalsList(rawContracts);
  return <ContractsView crmData={crmData} data={contracts} />;
}

const ContractsPage = async () => {
  const t = await getTranslations("CrmPage");
  return (
    <Container
      title={t("contracts.pageTitle")}
      description={t("contracts.pageDescription")}
    >
      <Suspense fallback={<CrmTableSkeleton />}>
        <ContractsContent />
      </Suspense>
    </Container>
  );
};

export default ContractsPage;

