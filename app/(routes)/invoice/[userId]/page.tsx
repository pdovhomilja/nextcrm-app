import React from "react";
import Container from "../../components/ui/Container";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { getUserInvoices } from "@/actions/invoice/get-user-invoices";
import { UsersInvoiceDataTable } from "./data-table/data-table";
import { columns } from "../data-table/columns";
import { Invoices, Users } from "@prisma/client";

type Props = {
  userId: string;
};

const MyInvoicesPage = async ({ userId }: Props) => {
  const session = await getServerSession(authOptions);
  const userInvoices: any = await getUserInvoices(userId);
  return (
    <Container
      title={`${session?.user.name} - invoices`}
      description="Invoices assigned to me"
    >
      <UsersInvoiceDataTable data={userInvoices} columns={columns} />
    </Container>
  );
};

export default MyInvoicesPage;
