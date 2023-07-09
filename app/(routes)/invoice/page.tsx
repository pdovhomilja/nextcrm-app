import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import React from "react";
import Container from "../components/ui/Container";
import { getInvoices } from "@/actions/invoice/get-invoices";
import { InvoiceDataTable } from "./components/data-table";
import { columns } from "./components/columns";

type Props = {};

const CrmPage = async (props: Props) => {
  const invoices: any = await getInvoices();
  return (
    <Container
      title="Invoices"
      description={"Everything you need to know about invoices and TAX"}
    >
      <div>
        {/*         <pre>
          <code>{JSON.stringify(invoices[0], null, 2)}</code>
        </pre> */}
        <InvoiceDataTable data={invoices} columns={columns} />
      </div>
    </Container>
  );
};

export default CrmPage;
