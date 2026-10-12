"use server";

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

export type TeamMember = {
  id: string;
  name: string;
  workEmail: string | null;
  email: string;
};

export async function getTeamDirectory(): Promise<TeamMember[]> {
  const session = await getSession();
  if (!session?.user?.id) return [];

  const users = await prismadb.users.findMany({
    where: { userStatus: "ACTIVE" },
    select: {
      id: true,
      name: true,
      email: true,
      workEmail: true,
    },
    orderBy: { name: "asc" },
    take: 100,
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name?.trim() || u.email,
    workEmail: u.workEmail,
    email: u.email,
  }));
}
