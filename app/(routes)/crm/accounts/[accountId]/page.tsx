import Container from "@/app/(routes)/components/ui/Container";
import React from "react";
import { BasicView } from "./components/BasicView";

import { getAccount } from "@/actions/crm/get-account";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getOpportunitiesFullByAccountId } from "@/actions/crm/get-opportunities-with-includes-by-accountId";
import { getContactsByAccountId } from "@/actions/crm/get-contacts-by-accountId";
import { getLeadsByAccountId } from "@/actions/crm/get-leads-by-accountId";
import { getDocumentsByAccountId } from "@/actions/documents/get-documents-by-accountId";

import OpportunitiesView from "../../components/OpportunitiesView";
import LeadsView from "../../components/LeadsView";
import ContactsView from "../../components/ContactsView";
import DocumentsView from "../../components/DocumentsView";
import TasksView from "../../components/TasksView";
import { getTasksByAcccountId } from "@/actions/projects/get-tasks-by-accountsId";
import { crm_Accounts } from "@prisma/client";

interface AccountDetailPageProps {
  params: {
    accountId: string;
  };
}

const AccountDetailPage = async ({ params }: AccountDetailPageProps) => {
  const { accountId } = params;
  const account: crm_Accounts | null = await getAccount(accountId);
  const opportunities: any = await getOpportunitiesFullByAccountId(accountId);
  const contacts: any = await getContactsByAccountId(accountId);
  const leads: any = await getLeadsByAccountId(accountId);
  const documents: any = await getDocumentsByAccountId(accountId);
  const tasks: any = await getTasksByAcccountId(accountId);
  const crmData = await getAllCrmData();
  console.log(tasks, "tasks");

  if (!account) return <div>Account not found</div>;

  return (
    <Container
      title={`Account: ${account?.name}`}
      description={"Everything you need to know about sales potential"}
    >
      <div className="space-y-5">
        <BasicView data={account} />
        <TasksView data={tasks} account={account} />
        <OpportunitiesView
          data={opportunities}
          crmData={crmData}
          accountId={accountId}
        />
        <ContactsView data={contacts} crmData={crmData} accountId={accountId} />
        <LeadsView data={leads} crmData={crmData} />
        <DocumentsView data={documents} />
      </div>
    </Container>
  );
};

export default AccountDetailPage;
