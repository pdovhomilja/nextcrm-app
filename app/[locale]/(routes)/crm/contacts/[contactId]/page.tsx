import Container from "@/app/[locale]/(routes)/components/ui/Container";

import { BasicView } from "./components/BasicView";

import { getContact } from "@/actions/crm/get-contact";
import { getOpportunitiesFullByContactId } from "@/actions/crm/get-opportunities-with-includes-by-contactId";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getDocumentsByContactId } from "@/actions/documents/get-documents-by-contactId";
import { getAccountsByContactId } from "@/actions/crm/get-accounts-by-contactId";

import AccountsView from "../../components/AccountsView";
import OpportunitiesView from "../../components/OpportunitiesView";
import DocumentsView from "../../components/DocumentsView";

const ContactViewPage = async (props: any) => {
  const params = await props.params;
  const { contactId } = params;
  const contact: any = await getContact(contactId);
  const opportunities: any = await getOpportunitiesFullByContactId(contactId);
  const documents = await getDocumentsByContactId(contactId);
  const accounts = await getAccountsByContactId(contactId);
  const crmData = await getAllCrmData();

  //  console.log(accounts, "accounts");

  if (!contact) return <div>Contact not found</div>;

  return (
    <Container
      title={`Contact detail view: ${contact?.first_name} ${contact?.last_name}`}
      description={"Everything you need to know about sales potential"}
    >
      <div className="space-y-5">
        <BasicView data={contact} />
        <AccountsView data={accounts} crmData={crmData} />
        <OpportunitiesView data={opportunities} crmData={crmData} />
        <DocumentsView data={documents} />
      </div>
    </Container>
  );
};

export default ContactViewPage;
