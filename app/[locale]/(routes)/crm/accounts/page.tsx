import React, { Suspense } from "react";

import AccountsView from "../components/AccountsView";
import Container from "../../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getAccounts } from "@/actions/crm/get-accounts";
import { getTranslations } from "next-intl/server";

const AccountsPage = async () => {
  const t = await getTranslations("CrmPage");
  const crmData = await getAllCrmData();
  const accounts = await getAccounts();

  return (
    <Container
      title={t("accounts.pageTitle")}
      description={t("accounts.pageDescription")}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <AccountsView crmData={crmData} data={accounts} />
      </Suspense>
    </Container>
  );
};

export default AccountsPage;
