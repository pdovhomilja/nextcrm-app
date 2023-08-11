import Container from "../components/ui/Container";
import { getInvoices } from "@/actions/invoice/get-invoices";
import { InvoiceDataTable } from "./data-table/data-table";
import { columns } from "./data-table/columns";
import ModalDropzone from "./components/modal-dropzone";
import { FileInput } from "./components/FileInput";
import { getRossumToken } from "@/actions/invoice/get-rossum-token";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const InvoicePage = async () => {
  const session = await getServerSession(authOptions);
  const invoices: any = await getInvoices();

  return (
    <Container
      title="Invoices"
      description={"Everything you need to know about invoices and TAX"}
    >
      <div className="flex py-5 space-x-3">
        <ModalDropzone buttonLabel="Upload pdf" />
        <Button asChild>
          <Link href={`/invoice/${session?.user.id}`}>My invoices</Link>
        </Button>
      </div>
      <div>
        <InvoiceDataTable data={invoices} columns={columns} />
      </div>
    </Container>
  );
};

export default InvoicePage;
