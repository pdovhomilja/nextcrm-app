import { Suspense } from "react";

import SuspenseLoading from "@/components/loadings/suspense";
import Container from "../../components/ui/Container";
import TargetListsView from "./components/TargetListsView";
import { getTargetLists } from "@/actions/crm/get-target-lists";

const TargetListsPage = async () => {
  const targetLists = await getTargetLists();
  return (
    <Container
      title="Target Lists"
      description="Manage your target lists for campaigns and outreach"
    >
      <Suspense fallback={<SuspenseLoading />}>
        <TargetListsView data={targetLists} />
      </Suspense>
    </Container>
  );
};

export default TargetListsPage;
