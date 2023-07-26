import React, { Suspense } from "react";
import Link from "next/link";

import H2Title from "@/components/typography/h2";

import AccountView from "./accounts/components/AccountView";
import Container from "../components/ui/Container";

import OpportunityView from "./opportunities/components/OpportunityView";
import ContactView from "./contacts/components/ContactView";

type Props = {};

const CrmPage = async (props: Props) => {
  return (
    <Container
      title="CRM"
      description={"Everything you need to know about sales"}
    >
      <Suspense fallback={"Loading ..."}>
        <Link href="/crm/accounts">
          <H2Title>Accounts</H2Title>
        </Link>
        <AccountView />
      </Suspense>
      <Suspense fallback={"Loading ..."}>
        <Link href="/crm/contacts">
          <H2Title>Contacts</H2Title>
        </Link>
        <ContactView />
      </Suspense>
      <Suspense fallback={"Loading ..."}>
        <Link href="/crm/opportunities">
          <H2Title>Opportunities</H2Title>
        </Link>
        <OpportunityView />
      </Suspense>
      <Suspense fallback={"Loading ..."}>
        <Link href="/crm/leads">
          <H2Title>Leads</H2Title>
        </Link>
        <AccountView />
      </Suspense>
    </Container>
  );
};

export default CrmPage;
