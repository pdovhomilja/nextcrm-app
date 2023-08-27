import LeadsView from "./components/LeadsView";
import Container from "../components/ui/Container";
import AccountsView from "./components/AccountsView";
import ContactsView from "./components/ContactsView";
import OpportunitiesView from "./components/OpportunitiesView";

import { getLeads } from "@/actions/crm/get-leads";
import { getAccounts } from "@/actions/crm/get-accounts";
import { getContacts } from "@/actions/crm/get-contacts";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getOpportunitiesFull } from "@/actions/crm/get-opportunities-with-includes";

const CrmPage = async () => {
  const crmData = await getAllCrmData();
  const accounts = await getAccounts();
  const contacts = await getContacts();
  const opportunities = await getOpportunitiesFull();
  const leads = await getLeads();

  return (
    <Container
      title="CRM"
      description={"Everything you need to know about sales"}
    >
      <div className="space-y-5">
        <AccountsView crmData={crmData} data={accounts} />
        <ContactsView crmData={crmData} data={contacts} />
        <OpportunitiesView crmData={crmData} data={opportunities} />
        <LeadsView crmData={crmData} data={leads} />
      </div>
    </Container>
  );
};

export default CrmPage;
