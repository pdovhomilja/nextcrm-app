import { getContact } from "@/actions/crm/get-contact";

import Container from "@/app/(routes)/components/ui/Container";

import { BasicView } from "./components/BasicView";

import DocumentsView from "./components/DocumentsView";
import OpportunitiesView from "./components/OpportunitiesView";
import ContactView from "./components/ContactView";

const ContactViewPage = async ({ params }: any) => {
  const { contactId } = params;
  const contact: any = await getContact(contactId);

  if (!contact) return <div>Contact not found</div>;

  return (
    <Container
      title={`Contact detail view: ${contact?.first_name} ${contact?.last_name}`}
      description={"Everything you need to know about sales potential"}
    >
      <div className="space-y-5">
        <BasicView data={contact} />
        <OpportunitiesView
          data={contact?.assigned_opportunities}
          accountId={contact.id}
        />

        <DocumentsView data={contact?.assigned_documents} />
      </div>
    </Container>
  );
};

export default ContactViewPage;
