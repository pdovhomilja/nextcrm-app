import React, { Suspense } from "react";
import Container from "../../components/ui/Container";
import CrmTableSkeleton from "@/components/skeletons/crm-table-skeleton";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getContractsWithIncludes } from "@/actions/crm/get-contracts";
import ContractsView from "../components/ContractsView";
import { getTranslations } from "next-intl/server";
import { serializeDecimalsList } from "@/lib/serialize-decimals";

const ContractsPage = async () => {
  const t = await getTranslations("CrmPage");
  const crmData = await getAllCrmData();
  const contracts = serializeDecimalsList(await getContractsWithIncludes() as Record<string, unknown>[]);
  return (
    <Container
      title={t("contracts.pageTitle")}
      description={t("contracts.pageDescription")}
    >
      <Suspense fallback={<CrmTableSkeleton />}>
        <ContractsView crmData={crmData} data={contracts} />
      </Suspense>
    </Container>
  );
};

export default ContractsPage;
