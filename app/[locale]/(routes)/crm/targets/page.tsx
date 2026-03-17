import { Suspense } from "react";

import SuspenseLoading from "@/components/loadings/suspense";
import Container from "../../components/ui/Container";
import TargetsView from "./components/TargetsView";
import { getTargets } from "@/actions/crm/get-targets";

const TargetsPage = async () => {
  const targets = await getTargets();
  return (
    <Container
      title="Targets"
      description="Manage your marketing and sales targets"
    >
      <Suspense fallback={<SuspenseLoading />}>
        <TargetsView data={targets} />
      </Suspense>
    </Container>
  );
};

export default TargetsPage;
