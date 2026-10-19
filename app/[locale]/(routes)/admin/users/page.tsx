import { getUsers } from "@/actions/get-users";
import React from "react";
import Container from "../../components/ui/Container";
import { InviteForm } from "./components/IviteForm";
import { getOrgEmailDomain } from "@/lib/org-work-email";
import { Separator } from "@/components/ui/separator";

import { getSession } from "@/lib/auth-server";
import { AdminUserDataTable } from "./table-components/data-table";
import { columns } from "./table-components/columns";
import { Users } from "@prisma/client";
import { Button } from "@/components/ui/button";
import SendMailToAll from "./components/send-mail-to-all";
import { getTranslations } from "next-intl/server";
import { listVentureOptions } from "@/lib/vensai/venture-catalog";

const AdminUsersPage = async () => {
  const users: Users[] = await getUsers();
  const orgDomain = getOrgEmailDomain();
  const t = await getTranslations("AdminPage");

  const session = await getSession();
  const ventureOptions = listVentureOptions();

  if (session?.user?.role !== "admin") {
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

  return (
    <Container
      title={t("users.title")}
      description={t("users.description")}
    >
      <div className="flex-col1">
        <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
          {t("users.inviteHeading")}
        </h4>
        <InviteForm orgDomain={orgDomain} ventureOptions={ventureOptions} />
      </div>
      <Separator />
      <div>
        <SendMailToAll />
      </div>
      <Separator />

      <AdminUserDataTable columns={columns} data={users} ventureOptions={ventureOptions} />
    </Container>
  );
};

export default AdminUsersPage;
