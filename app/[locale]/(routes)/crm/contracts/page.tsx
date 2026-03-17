import React, { Suspense } from "react";
import Container from "../../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getContractsWithIncludes } from "@/actions/crm/get-contracts";
import ContractsView from "../components/ContractsView";
import { getTranslations } from "next-intl/server";

const ContractsPage = async () => {
  const t = await getTranslations("CrmPage");
  const crmData = await getAllCrmData();
  const contracts = await getContractsWithIncludes();
  return (
    <Container
      title={t("contracts.pageTitle")}
      description={t("contracts.pageDescription")}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <ContractsView crmData={crmData} data={contracts} />
      </Suspense>
    </Container>
  );
};

export default ContractsPage;
