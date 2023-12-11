import { getLead } from "@/actions/crm/get-lead";
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import React from "react";
import { BasicView } from "./components/BasicView";

interface LeadDetailPageProps {
  params: {
    leadId: string;
  };
}

const LeadDetailPage = async ({ params }: LeadDetailPageProps) => {
  const { leadId } = params;
  const lead: any = await getLead(leadId);

  if (!lead) return <div>Lead not found</div>;

  return (
    <Container
      title={`Lead: ${lead?.firstName} ${lead?.lastName}`}
      description={"Everything you need to know about sales potential"}
    >
      <div className="space-y-5">
        <BasicView data={lead} />
        {/*        <DocumentsView data={lead?.documents} /> */}
      </div>
    </Container>
  );
};

export default LeadDetailPage;
