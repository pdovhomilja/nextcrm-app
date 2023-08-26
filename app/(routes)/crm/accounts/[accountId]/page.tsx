import { getAccount } from "@/actions/crm/get-account";
import Container from "@/app/(routes)/components/ui/Container";
import React from "react";
import { BasicView } from "./components/BasicView";

import ContactView from "./components/ContactView";
import DocumentsView from "./components/DocumentsView";

import OpportunitiesView from "./components/OpportunitiesView";

import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getOpportunitiesFullByAccountId } from "@/actions/crm/get-opportunities-with-includes-by-accountId";
import { getContactsByAccountId } from "@/actions/crm/get-contacts-by-accountId";
import LeadsView from "./components/LeadsView";
import { getLeadsByAccountId } from "@/actions/crm/get-leads-by-accountId";
import { getDocumentsByAccountId } from "@/actions/documents/get-documents-by-accountId";

interface AccountDetailPageProps {
  params: {
    accountId: string;
  };
}

const AccountDetailPage = async ({ params }: AccountDetailPageProps) => {
  const { accountId } = params;
  const account: any = await getAccount(accountId);
  const opportunities: any = await getOpportunitiesFullByAccountId(accountId);
  const contacts: any = await getContactsByAccountId(accountId);
  const leads: any = await getLeadsByAccountId(accountId);
  const documents: any = await getDocumentsByAccountId(accountId);
  //console.log(account, "account");

  const crmData = await getAllCrmData();

  if (!account) return <div>Account not found</div>;

  return (
    <Container
      title={`Account: ${account?.name}`}
      description={"Everything you need to know about sales potential"}
    >
      <div className="space-y-5">
        <BasicView data={account} />
        <div>
          <OpportunitiesView
            data={opportunities}
            crmData={crmData}
            accountId={accountId}
          />
        </div>

        <ContactView data={contacts} crmData={crmData} accountId={account.id} />
        <LeadsView data={leads} crmData={crmData} />
        <DocumentsView data={documents} />
      </div>
    </Container>
  );
};

export default AccountDetailPage;
