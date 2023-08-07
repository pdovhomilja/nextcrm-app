import Container from "../components/ui/Container";
import { getInvoices } from "@/actions/invoice/get-invoices";
import { InvoiceDataTable } from "./data-table/data-table";
import { columns } from "./data-table/columns";
import ModalDropzone from "./components/modal-dropzone";
import { FileInput } from "./components/FileInput";

const InvoicePage = async () => {
  const invoices: any = await getInvoices();
  return (
    <Container
      title="Invoices"
      description={"Everything you need to know about invoices and TAX"}
    >
      <div className="py-5 space-x-3">
        <ModalDropzone buttonLabel="Upload pdf" fileType="pdfUploader" />
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
