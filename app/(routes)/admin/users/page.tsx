import { getUsers } from "@/actions/get-users";
import React from "react";
import Container from "../../components/ui/Container";
import { DataTable } from "./components/data-table";
import { columns } from "./components/Columns";
import { InviteForm } from "./components/IviteForm";
import { Separator } from "@/components/ui/separator";
import { getUser } from "@/actions/get-user";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Props = {};

const AdminUsersPage = async (props: Props) => {
  const users: any = await getUsers();

  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return (
      <Container
        title="Administration"
        description="You are not admin, access not allowed"
      >
        <div className="flex w-full h-full items-center justify-center">
          Access not allowed
        </div>
      </Container>
    );
  }

  return (
    <Container
      title="Users administration"
      description={"Here you can manage your NextCRM users"}
    >
      <div className="flex-col1">
        <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
          Invite new user to NextCRM
        </h4>
        <InviteForm />
      </div>
      <Separator />
      <DataTable columns={columns} data={users} search="name" />
    </Container>
  );
};

export default AdminUsersPage;
