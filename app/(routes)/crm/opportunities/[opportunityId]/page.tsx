import { getOpportunity } from "@/actions/crm/get-opportunity";
import Container from "@/app/(routes)/components/ui/Container";
import React from "react";
import { BasicView } from "./components/BasicView";
import { crm_Opportunities } from "@prisma/client";
import ContactView from "./components/ContactView";
import DocumentsView from "./components/DocumentsView";

const OpportunityView = async ({
  params: { opportunityId },
}: {
  params: { opportunityId: string };
}) => {
  //TODO: Add a loading state
  //TODO: fix any
  const opportunity: any = await getOpportunity(opportunityId);

  if (!opportunity) return <div>Opportunity not found</div>;

  return (
    <Container
      title={`Opportunity ${opportunity.name} - detail view`}
      description={"Description - " + opportunity.description}
    >
      <div className="space-y-5">
        <BasicView data={opportunity} />
        <ContactView
          data={opportunity.contacts}
          opportunityId={opportunity.id}
        />
        <DocumentsView data={opportunity.documents} />
      </div>
    </Container>
  );
};

export default OpportunityView;
