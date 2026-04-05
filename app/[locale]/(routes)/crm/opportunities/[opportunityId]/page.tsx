import Container from "@/app/[locale]/(routes)/components/ui/Container";
import React from "react";

import { BasicView } from "./components/BasicView";
import { FindSimilarButton } from "@/components/crm/find-similar-button";
import LineItemsSection from "./components/LineItemsSection";

import DocumentsView from "../../components/DocumentsView";
import ContactsView from "../../components/ContactsView";
import AccountsView from "../../components/AccountsView";

import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getOpportunity } from "@/actions/crm/get-opportunity";
import { getContactsByOpportunityId } from "@/actions/crm/get-contacts-by-opportunityId";
import { getDocumentsByOpportunityId } from "@/actions/documents/get-documents-by-opportunityId";
import { getAccountsByOpportunityId } from "@/actions/crm/get-accounts-by-opportunityId";
import { getProductsFull } from "@/actions/crm/products/get-products";
import { serializeDecimalsList } from "@/lib/serialize-decimals";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HistoryTab } from "./components/HistoryTab";
import { ActivitiesSection } from "./components/ActivitiesSection";

const OpportunityView = async (
  props: {
    params: Promise<{ opportunityId: string }>;
  }
) => {
  const params = await props.params;

  const {
    opportunityId
  } = params;

  const [opportunity, crmData, accounts, contacts, documents, allProducts] =
    await Promise.all([
      getOpportunity(opportunityId),
      getAllCrmData(),
      getAccountsByOpportunityId(opportunityId),
      getContactsByOpportunityId(opportunityId),
      getDocumentsByOpportunityId(opportunityId),
      getProductsFull(),
    ]);

  const activeProducts = allProducts
    .filter((p: any) => p.status === "ACTIVE")
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      unit_price: Number(p.unit_price),
    }));

  const serializedLineItems = opportunity?.lineItems
    ? serializeDecimalsList(opportunity.lineItems as any[])
    : [];

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
            <BasicView data={opportunity as any} />
            <LineItemsSection
              opportunityId={opportunityId}
              lineItems={serializedLineItems}
              currency={(opportunity as any)?.currency || "EUR"}
              products={activeProducts}
            />
            <ActivitiesSection opportunityId={opportunityId} />
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
