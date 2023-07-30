import { Suspense } from "react";

import SuspenseLoading from "@/components/loadings/suspense";

import Container from "../../components/ui/Container";
import ContactView from "./components/ContactView";

const AccountsPage = async () => {
  return (
    <Container
      title="Contacts"
      description={"Everything you need to know about your contacts"}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <ContactView />
      </Suspense>
    </Container>
  );
};

export default AccountsPage;
