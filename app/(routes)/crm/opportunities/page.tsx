import { Suspense } from "react";

import SuspenseLoading from "@/components/loadings/suspense";

import Container from "../../components/ui/Container";
import OpportunityView from "./components/OpportunityView";

const AccountsPage = async () => {
  return (
    <Container
      title="Opportunities"
      description={"Everything you need to know about your accounts"}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <OpportunityView />
      </Suspense>
    </Container>
  );
};

export default AccountsPage;
