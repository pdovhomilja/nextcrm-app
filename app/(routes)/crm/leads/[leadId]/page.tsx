import { getLead } from "@/actions/crm/get-lead";
import Container from "@/app/(routes)/components/ui/Container";
import React from "react";

interface LeadDetailPageProps {
  params: {
    leadId: string;
  };
}

const LeadDetailPage = async ({ params }: LeadDetailPageProps) => {
  const { leadId } = params;
  const lead = await getLead(leadId);
  return (
    <Container
      title="Lead - Detail"
      description={"Everything you need to know about sales potential"}
    >
      <div>
        <h1>Leads</h1>
        <pre>{JSON.stringify(lead, null, 2)}</pre>
      </div>
    </Container>
  );
};

export default LeadDetailPage;
