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
import { getAccountProducts } from "@/actions/crm/account-products/get-account-products";
import { getProductsFull } from "@/actions/crm/products/get-products";
import { serializeDecimalsList } from "@/lib/serialize-decimals";
import { getAccountsTasks } from "@/actions/crm/account/get-tasks";
import { getInvoicesByAccountId } from "@/actions/invoices/get-invoices-by-accountId";
import { getTranslations } from "next-intl/server";

import OpportunitiesView from "../../components/OpportunitiesView";
import LeadsView from "../../components/LeadsView";
import ContactsView from "../../components/ContactsView";
import DocumentsView from "../../components/DocumentsView";
import InvoicesView from "../../components/InvoicesView";

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
import AccountProductsView from "./components/AccountProductsView";
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
  const opportunities: crm_Opportunities[] = serializeDecimalsList(
    await getOpportunitiesFullByAccountId(accountId)
  );
  const contacts: crm_Contacts[] = await getContactsByAccountId(accountId);
  const contracts: crm_Contracts[] = serializeDecimalsList(
    await getContractsByAccountId(accountId)
  );
  const leads: crm_Leads[] = await getLeadsByAccountId(accountId);
  const documents: Documents[] = await getDocumentsByAccountId(accountId);
  const tasks: crm_Accounts_Tasks[] = await getAccountsTasks(accountId);
  const invoices = await getInvoicesByAccountId(accountId);
  const t = await getTranslations("InvoicesPage");
  const invoiceStatusLabels: Record<string, string> = {
    DRAFT: t("status.DRAFT"),
    ISSUED: t("status.ISSUED"),
    SENT: t("status.SENT"),
    PARTIALLY_PAID: t("status.PARTIALLY_PAID"),
    PAID: t("status.PAID"),
    OVERDUE: t("status.OVERDUE"),
    CANCELLED: t("status.CANCELLED"),
    DISPUTED: t("status.DISPUTED"),
    REFUNDED: t("status.REFUNDED"),
    WRITTEN_OFF: t("status.WRITTEN_OFF"),
  };
  const invoiceTableLabels = {
    number: t("table.number"),
    account: t("table.account"),
    issueDate: t("table.issueDate"),
    dueDate: t("table.dueDate"),
    total: t("table.total"),
    status: t("table.status"),
    type: t("table.type"),
    currency: t("table.currency"),
  };
  const crmData = await getAllCrmData();
  const accountProducts = serializeDecimalsList(
    await getAccountProducts(accountId)
  );
  const allProducts = await getProductsFull();
  const activeProducts = allProducts
    .filter((p) => p.status === "ACTIVE")
    .map((p) => ({ id: p.id, name: p.name, currency: p.currency }));

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
            <AccountProductsView
              data={accountProducts}
              accountId={accountId}
              crmData={crmData}
              activeProducts={activeProducts}
            />
            <DocumentsView data={documents} accountId={accountId} />
            <InvoicesView
              data={JSON.parse(JSON.stringify(invoices))}
              accountId={accountId}
              statusLabels={invoiceStatusLabels}
              tableLabels={invoiceTableLabels}
            />
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
