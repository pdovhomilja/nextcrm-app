import { getOpportunity } from "@/actions/crm/get-opportunity";
import React from "react";

type Props = {
  opportunityId: string;
};

const OpportunityView = async ({ opportunityId }: Props) => {
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
