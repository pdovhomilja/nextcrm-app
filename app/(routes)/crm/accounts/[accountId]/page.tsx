import { getAccount } from "@/actions/crm/get-account";
import Container from "@/app/(routes)/components/ui/Container";
import React from "react";
import { BasicView } from "./components/BasicView";
import { crm_Opportunities } from "@prisma/client";
import ContactView from "./components/ContactView";
import DocumentsView from "./components/DocumentsView";

import { crm_Accounts } from "@prisma/client";
import OpportunitiesView from "./components/OpportunitiesView";

interface AccountDetailPageProps {
  params: {
    accountId: string;
  };
}

const AccountDetailPage = async ({ params }: AccountDetailPageProps) => {
  const { accountId } = params;
  const account: any = await getAccount(accountId);
  //console.log(account, "account");

  if (!account) return <div>Account not found</div>;

  return (
    <Container
      title={`Account: ${account?.name}`}
      description={"Everything you need to know about sales potential"}
    >
      <div className="space-y-5">
        <BasicView data={account} />
        <OpportunitiesView
          data={account?.opportunities}
          accountId={account.id}
        />
        <ContactView data={account?.contacts} accountId={account.id} />
        <DocumentsView data={account?.documents} />
      </div>
    </Container>
  );
};

export default AccountDetailPage;
