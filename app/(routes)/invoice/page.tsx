import Container from "../components/ui/Container";
import { getInvoices } from "@/actions/invoice/get-invoices";
import { InvoiceDataTable } from "./components/data-table";
import { columns } from "./components/columns";

import RightViewModal from "../../../components/modals/right-view-modal";

const InvoicePage = async () => {
  const invoices: any = await getInvoices();
  return (
    <Container
      title="Invoices"
      description={"Everything you need to know about invoices and TAX"}
    >
      <div className="py-5 space-x-3">
        <RightViewModal
          label={"Test button 2"}
          title="Modal title"
          trigger={true}
          description="Modal description"
        >
          <div className="w-[1600px]">modal content</div>
        </RightViewModal>
        <RightViewModal
          label={"Test button"}
          title="Modal title"
          trigger={true}
          description="Modal description"
        >
          Modal content
        </RightViewModal>
      </div>
      <div>
        {/*         <pre>
          <code>{JSON.stringify(invoices[0], null, 2)}</code>
        </pre> */}
        <InvoiceDataTable data={invoices} columns={columns} />
      </div>
    </Container>
  );
};

export default InvoicePage;
