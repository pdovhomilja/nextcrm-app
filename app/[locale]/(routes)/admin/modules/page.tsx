import React from "react";
import { getServerSession } from "next-auth";

import { columns } from "./components/Columns";
import { DataTable } from "./components/data-table";
import Container from "../../components/ui/Container";

import { authOptions } from "@/lib/auth";
import { getModules } from "@/actions/get-modules";
import { getTranslations } from "next-intl/server";

const AdminModulesPage = async () => {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("AdminPage");

  if (!session?.user?.isAdmin) {
    return (
      <Container
        title={t("title")}
        description={t("accessNotAllowed")}
      >
        <div className="flex w-full h-full items-center justify-center">
          {t("accessNotAllowed")}
        </div>
      </Container>
    );
  }

  const modules: any = await getModules();
  return (
    <Container
      title={t("modules.title")}
      description={t("modules.description")}
    >
      <DataTable columns={columns} data={modules} search="name" />
    </Container>
  );
};

export default AdminModulesPage;
