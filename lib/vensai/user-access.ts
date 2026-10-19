import { prismadb } from "@/lib/prisma";
import { syncVentureAccessToAdminPortal } from "@/lib/vensai/sync-access";

export async function getUserAccessProfile(userId: string) {
  return prismadb.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      workEmail: true,
      name: true,
      crmEnabled: true,
      ventureGrants: { select: { ventureSlug: true } },
    },
  });
}

export async function setUserVentureAccess(input: {
  userId: string;
  ventureSlugs: string[];
  crmEnabled: boolean;
}) {
  const slugs = Array.from(
    new Set(input.ventureSlugs.map((s) => s.trim()).filter(Boolean)),
  );
  const user = await prismadb.users.update({
    where: { id: input.userId },
    data: {
      crmEnabled: input.crmEnabled,
      ventureGrants: {
        deleteMany: {},
        create: slugs.map((ventureSlug) => ({ ventureSlug })),
      },
    },
    select: {
      email: true,
      workEmail: true,
      name: true,
      crmEnabled: true,
      ventureGrants: { select: { ventureSlug: true } },
    },
  });

  await syncVentureAccessToAdminPortal({
    email: user.email,
    workEmail: user.workEmail,
    name: user.name,
    crmEnabled: user.crmEnabled,
    ventureSlugs: user.ventureGrants.map((g) => g.ventureSlug),
  });

  return user;
}
