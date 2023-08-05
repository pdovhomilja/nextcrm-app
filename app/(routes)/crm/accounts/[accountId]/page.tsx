import { getAccount } from "@/actions/crm/get-account";
import Container from "@/app/(routes)/components/ui/Container";
import React from "react";

import { crm_Accounts } from "@prisma/client";

interface AccountDetailPageProps {
  params: {
    accountId: string;
  };
}

const AccountDetailPage = async ({ params }: AccountDetailPageProps) => {
  const { accountId } = params;
  const account: crm_Accounts | null = await getAccount(accountId);
  return (
    <Container
      title={`Account: ${account?.name}`}
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
