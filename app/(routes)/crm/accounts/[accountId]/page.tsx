import { getAccount } from "@/actions/crm/get-account";
import { getLead } from "@/actions/crm/get-lead";
import Container from "@/app/(routes)/components/ui/Container";
import React from "react";

interface AccountDetailPageProps {
  params: {
    accountId: string;
  };
}

const AccountDetailPage = async ({ params }: AccountDetailPageProps) => {
  const { accountId } = params;
  const account: any = await getAccount(accountId);
  return (
    <Container
      title={`Account: ${account?.map((a: any) => a.name)}`}
      description={"Everything you need to know about sales potential"}
    >
      <div>
        <h1>Accounts</h1>
        <pre>{JSON.stringify(account, null, 2)}</pre>
      </div>
    </Container>
  );
};

export default AccountDetailPage;
