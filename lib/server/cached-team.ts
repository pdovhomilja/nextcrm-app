import { unstable_cache } from "next/cache";
import { prismadb } from "@/lib/prisma";
import type { TeamMember } from "@/actions/team/get-team-directory";

async function loadTeamDirectory(): Promise<TeamMember[]> {
  const users = await prismadb.users.findMany({
    where: { userStatus: "ACTIVE" },
    select: { id: true, name: true, email: true, workEmail: true },
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

/** Active team roster for chat/schedule — shared across users, short TTL. */
export const getCachedTeamDirectory = unstable_cache(
  loadTeamDirectory,
  ["team-directory-v1"],
  { revalidate: 90, tags: ["team-directory"] }
);
