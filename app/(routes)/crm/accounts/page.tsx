import React from "react";

import AccountView from "./components/AccountView";
import Container from "../../components/ui/Container";

const AccountsPage = async () => {
  return (
    <Container
      title="Accounts"
      description={"Everything you need to know about your accounts"}
    >
      <div>
        <AccountView />
      </div>
    </Container>
  );
};

export default AccountsPage;
