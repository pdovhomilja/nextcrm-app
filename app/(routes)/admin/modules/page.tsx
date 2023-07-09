import { getUsers } from "@/actions/get-users";
import React from "react";
import Container from "../../components/ui/Container";
import { DataTable } from "./components/data-table";
import { columns } from "./components/Columns";
import { InviteForm } from "./components/IviteForm";
import { Separator } from "@/components/ui/separator";
import { getModules } from "@/actions/get-modules";

type Props = {};

const AdminUsersPage = async (props: Props) => {
  const modules: any = await getModules();
  return (
    <Container
      title="Modules administration"
      description={"Here you can manage your NextCRM modules"}
    >
      <DataTable columns={columns} data={modules} search="name" />
    </Container>
  );
};

export default AdminUsersPage;
