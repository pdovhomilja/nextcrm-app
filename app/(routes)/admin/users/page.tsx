import { getUsers } from "@/actions/get-users";
import React from "react";
import Container from "../../components/ui/Container";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./components/Columns";
import { InviteForm } from "./components/IviteForm";

type Props = {};

const AdminUsersPage = async (props: Props) => {
  const users: any = await getUsers();
  return (
    <Container
      title="Users administration"
      description={"Here you can manage your NextCRM users"}
    >
      <div className="flex ">
        <InviteForm />
      </div>
      <DataTable columns={columns} data={users} search="name" />
    </Container>
  );
};

export default AdminUsersPage;
