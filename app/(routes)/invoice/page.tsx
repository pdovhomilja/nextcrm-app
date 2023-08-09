import Container from "../components/ui/Container";
import { getInvoices } from "@/actions/invoice/get-invoices";
import { InvoiceDataTable } from "./data-table/data-table";
import { columns } from "./data-table/columns";
import ModalDropzone from "./components/modal-dropzone";
import { FileInput } from "./components/FileInput";
import { getRossumToken } from "@/actions/invoice/get-rossum-token";

const InvoicePage = async () => {
  const invoices: any = await getInvoices();

  return (
    <Container
      title="Invoices"
      description={"Everything you need to know about invoices and TAX"}
    >
      <div className="py-5 space-x-3">
        <ModalDropzone buttonLabel="Upload pdf" />
      </div>
      <div>
        <InvoiceDataTable data={invoices} columns={columns} />
      </div>
    </Container>
  );
};

export default InvoicePage;
