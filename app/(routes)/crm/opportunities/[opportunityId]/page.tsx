import { getOpportunity } from "@/actions/crm/get-opportunity";
import React from "react";

const OpportunityView = async ({
  params: { opportunityId },
}: {
  params: { opportunityId: string };
}) => {
  const opportunity = await getOpportunity(opportunityId);
  return (
    <div>
      OpportunityView
      <pre>
        <code>{JSON.stringify(opportunity, null, 2)}</code>
      </pre>
    </div>
  );
};

export default OpportunityView;
