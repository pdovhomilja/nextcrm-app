import React, { Suspense } from "react";
import Link from "next/link";

import { DataTable } from "@/components/ui/data-table";
import H2Title from "@/components/typography/h2";

import { getLeads } from "@/actions/crm/get-leads";
import { getOpportunities } from "@/actions/crm/get-opportunities";

import AccountView from "./accounts/components/AccountView";
import Container from "../components/ui/Container";
import { columns } from "./components/Columns";
import OpportunityView from "./opportunities/components/OpportunityView";

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
