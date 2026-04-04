import Container from "@/app/[locale]/(routes)/components/ui/Container";
import React from "react";
import { BasicView } from "./components/BasicView";
import { FindSimilarButton } from "@/components/crm/find-similar-button";

import { getAccount } from "@/actions/crm/get-account";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getOpportunitiesFullByAccountId } from "@/actions/crm/get-opportunities-with-includes-by-accountId";
import { getContactsByAccountId } from "@/actions/crm/get-contacts-by-accountId";
import { getLeadsByAccountId } from "@/actions/crm/get-leads-by-accountId";
import { getDocumentsByAccountId } from "@/actions/documents/get-documents-by-accountId";
import { getContractsByAccountId } from "@/actions/crm/get-contracts";
import { serializeDecimalsList } from "@/lib/serialize-decimals";
import { getAccountsTasks } from "@/actions/crm/account/get-tasks";

import OpportunitiesView from "../../components/OpportunitiesView";
import LeadsView from "../../components/LeadsView";
import ContactsView from "../../components/ContactsView";
import DocumentsView from "../../components/DocumentsView";

import {
  Documents,
  crm_Accounts,
  crm_Accounts_Tasks,
  crm_Contacts,
  crm_Contracts,
  crm_Leads,
  crm_Opportunities,
} from "@prisma/client";

import AccountsTasksView from "./components/TasksView";
import ContractsView from "../../components/ContractsView";
import { ActivitiesSection } from "./components/ActivitiesSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HistoryTab } from "./components/HistoryTab";

interface AccountDetailPageProps {
  params: Promise<{
    accountId: string;
  }>;
}

const AccountDetailPage = async (props: AccountDetailPageProps) => {
  const params = await props.params;
  const { accountId } = params;
  const account: crm_Accounts | null = await getAccount(accountId);
  const opportunities = serializeDecimalsList(
    await getOpportunitiesFullByAccountId(accountId) as any[]
  ) as crm_Opportunities[];
  const contacts: crm_Contacts[] = await getContactsByAccountId(accountId);
  const contracts = serializeDecimalsList(
    await getContractsByAccountId(accountId) as any[]
  ) as crm_Contracts[];
  const leads: crm_Leads[] = await getLeadsByAccountId(accountId);
  const documents: Documents[] = await getDocumentsByAccountId(accountId);
  const tasks: crm_Accounts_Tasks[] = await getAccountsTasks(accountId);
  const crmData = await getAllCrmData();

  if (!account) return <div>Account not found</div>;

  return (
    <Container
      title={`Account: ${account?.name}`}
      description={"Everything you need to know about sales potential"}
    >
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="space-y-5">
            <BasicView data={account} />
            <ActivitiesSection accountId={account.id} />
            <FindSimilarButton entityType="account" recordId={accountId} />
            <AccountsTasksView data={tasks} account={account} />
            <OpportunitiesView
              data={opportunities}
              crmData={crmData}
              accountId={accountId}
            />
            <ContactsView data={contacts} crmData={crmData} accountId={accountId} />
            <ContractsView
              data={contracts}
              crmData={crmData}
              accountId={accountId}
            />
            <LeadsView data={leads} crmData={crmData} />
            <DocumentsView data={documents} accountId={accountId} />
          </div>
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab accountId={accountId} />
        </TabsContent>
      </Tabs>
    </Container>
  );
};

export default AccountDetailPage;
