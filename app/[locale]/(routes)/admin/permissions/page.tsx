import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import Container from "../../components/ui/Container";
import { PermissionsManager } from "./components/PermissionsManager";

export default async function PermissionsPage() {
  const session = await getSession();
  if (session?.user?.role !== "admin") redirect("/");

  const [roleOverrides, groups, users, userOverrides] = await Promise.all([
    prismadb.rolePermission.findMany({
      select: { role: true, feature: true, action: true, allowed: true },
    }),
    prismadb.permissionGroup.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        members: { select: { userId: true } },
        permissions: { select: { feature: true, action: true, effect: true } },
      },
    }),
    prismadb.users.findMany({
      where: { userStatus: { not: "INACTIVE" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    }),
    prismadb.userPermission.findMany({
      select: { userId: true, feature: true, action: true, effect: true },
    }),
  ]);

  return (
    <Container
      title="Permissions"
      description="Set what each role can do by default, give groups extra access, and override it for individual people."
    >
      <PermissionsManager
        roleOverrides={roleOverrides}
        groups={groups.map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          memberIds: g.members.map((m) => m.userId),
          permissions: g.permissions,
        }))}
        users={users.map((u) => ({
          id: u.id,
          name: u.name || u.email,
          email: u.email,
          role: u.role,
        }))}
        userOverrides={userOverrides}
      />
    </Container>
  );
}
