import { Suspense } from "react";

import SuspenseLoading from "@/components/loadings/suspense";

import Container from "../../components/ui/Container";
import LeadView from "./components/LeadView";

const LeadsPage = async () => {
  return (
    <Container
      title="Leads"
      description={"Everything you need to know about your leads"}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <LeadView />
      </Suspense>
    </Container>
  );
};

export default LeadsPage;
