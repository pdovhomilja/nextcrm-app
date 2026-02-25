import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { getInvoices } from "@/actions/invoice/get-invoices";
import { getAccountSettings } from "@/actions/invoice/get-account-settings";

import { columns } from "./data-table/columns";
import { InvoiceDataTable } from "./data-table/data-table";

import Container from "../components/ui/Container";

import ModalDropzone from "./components/modal-dropzone";
import { AccountSettingsSheet } from "./components/AccountSettingsSheet";

import { Button } from "@/components/ui/button";
import { MyAccount } from "@prisma/client";
import { getBoards } from "@/actions/projects/get-boards";
import NewTaskDialog from "./dialogs/NewTask";

import CronButton from "./components/cron-button";

const InvoicePage = async () => {
  const session = await getServerSession(authOptions);
  const invoices: any = await getInvoices();
  const myAccountSettings: MyAccount | null = await getAccountSettings();
  const boards = await getBoards(session?.user.id!);

  return (
    <Container
      title="Invoices"
      description={"Everything you need to know about invoices and TAX"}
    >
      <NewTaskDialog boards={boards} />
      <div className="flex justify-between py-5 w-full">
        <div className="flex space-x-2">
          <ModalDropzone buttonLabel="Upload pdf" />
          <Button asChild>
            <Link href={`/invoice/${session?.user.id}`}>My invoices</Link>
          </Button>
          <CronButton />
        </div>
        <div>
          <AccountSettingsSheet initialData={myAccountSettings} />
        </div>
      </div>
      <div>
        <InvoiceDataTable data={invoices} columns={columns} />
      </div>
    </Container>
  );
};

export default InvoicePage;
