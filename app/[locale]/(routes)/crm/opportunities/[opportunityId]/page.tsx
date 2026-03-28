import Container from "@/app/[locale]/(routes)/components/ui/Container";
import React from "react";

import { BasicView } from "./components/BasicView";
import { FindSimilarButton } from "@/components/crm/find-similar-button";

import DocumentsView from "../../components/DocumentsView";
import ContactsView from "../../components/ContactsView";
import AccountsView from "../../components/AccountsView";

import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getOpportunity } from "@/actions/crm/get-opportunity";
import { getContactsByOpportunityId } from "@/actions/crm/get-contacts-by-opportunityId";
import { getDocumentsByOpportunityId } from "@/actions/documents/get-documents-by-opportunityId";
import { getAccountsByOpportunityId } from "@/actions/crm/get-accounts-by-opportunityId";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HistoryTab } from "./components/HistoryTab";

const OpportunityView = async (
  props: {
    params: Promise<{ opportunityId: string }>;
  }
) => {
  const params = await props.params;

  const {
    opportunityId
  } = params;

  const opportunity: any = await getOpportunity(opportunityId);
  const crmData = await getAllCrmData();
  const accounts = await getAccountsByOpportunityId(opportunityId);
  const contacts = await getContactsByOpportunityId(opportunityId);
  const documents = await getDocumentsByOpportunityId(opportunityId);

  if (!opportunity) return <div>Opportunity not found</div>;

  return (
    <Container
      title={`Opportunity ${opportunity.name} - detail view`}
      description={"Description - " + opportunity.description}
    >
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="space-y-5">
            <BasicView data={opportunity} />
            <FindSimilarButton entityType="opportunity" recordId={opportunityId} />
            <AccountsView crmData={crmData} data={accounts} />
            <ContactsView crmData={crmData} data={contacts} />
            <DocumentsView data={documents} />
          </div>
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab opportunityId={opportunityId} />
        </TabsContent>
      </Tabs>
    </Container>
  );
};

export default OpportunityView;
