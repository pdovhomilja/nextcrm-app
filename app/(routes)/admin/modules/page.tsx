import { getUsers } from "@/actions/get-users";
import React from "react";
import Container from "../../components/ui/Container";
import { DataTable } from "./components/data-table";
import { columns } from "./components/Columns";
import { InviteForm } from "./components/IviteForm";
import { Separator } from "@/components/ui/separator";
import { getModules } from "@/actions/get-modules";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

const AdminModulesPage = async () => {
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

export default AdminModulesPage;
