import { Suspense } from "react";

import CrmTableSkeleton from "@/components/skeletons/crm-table-skeleton";

import Container from "../../components/ui/Container";
import ContactsView from "../components/ContactsView";
import { getContacts } from "@/actions/crm/get-contacts";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getTranslations } from "next-intl/server";

async function ContactsContent() {
  const [crmData, contacts] = await Promise.all([
    getAllCrmData(),
    getContacts(),
  ]);
  return <ContactsView crmData={crmData} data={contacts} />;
}

const ContactsPage = async () => {
  const t = await getTranslations("CrmPage");
  return (
    <Container
      title={t("contacts.pageTitle")}
      description={t("contacts.pageDescription")}
    >
      <Suspense fallback={<CrmTableSkeleton />}>
        <ContactsContent />
      </Suspense>
    </Container>
  );
};

export default ContactsPage;

