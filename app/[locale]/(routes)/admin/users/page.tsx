import { getUsers } from "@/actions/get-users";
import React from "react";
import Container from "../../components/ui/Container";
import { getOrgEmailDomain } from "@/lib/org-work-email";

import { getSession } from "@/lib/auth-server";
import { UsersAdmin } from "./components/UsersAdmin";
import { getTranslations } from "next-intl/server";

const AdminUsersPage = async () => {
  const users = await getUsers();
  const orgDomain = getOrgEmailDomain();
  const t = await getTranslations("AdminPage");

  const session = await getSession();

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
      <UsersAdmin
        orgDomain={orgDomain}
        inviteHeading={t("users.inviteHeading")}
        users={users.map((user) => ({
          id: user.id,
          created_on: user.created_on,
          lastLoginAt: user.lastLoginAt,
          role: user.role,
          name: user.name,
          email: user.email,
          workEmail: user.workEmail,
          phone: user.phone,
          username: user.username,
          userStatus: user.userStatus,
          userLanguage: user.userLanguage,
        }))}
      />
    </Container>
  );
};

export default AdminUsersPage;
