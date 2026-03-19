"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const fulltextSearch = async (search: string) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  if (!search) return { error: "Search term is required" };

  try {
    // Search in CRM (Opportunities)
    const resultsCrmOpportunities = await prismadb.crm_Opportunities.findMany({
      where: {
        OR: [
          { description: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ],
      },
    });

    // Search in CRM (Accounts)
    const resultsCrmAccounts = await prismadb.crm_Accounts.findMany({
      where: {
        OR: [
          { description: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      },
    });

    // Search in CRM (Contacts)
    const resultsCrmContacts = await prismadb.crm_Contacts.findMany({
      where: {
        OR: [
          { last_name: { contains: search, mode: "insensitive" } },
          { first_name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      },
    });

    // Search in local user database
    const resultsUser = await prismadb.users.findMany({
      where: {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { account_name: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
          { username: { contains: search, mode: "insensitive" } },
        ],
      },
    });

    const resultsTasks = await prismadb.tasks.findMany({
      where: {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
        ],
      },
    });

    const reslutsProjects = await prismadb.boards.findMany({
      where: {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      },
    });

    const data = {
      opportunities: resultsCrmOpportunities,
      accounts: resultsCrmAccounts,
      contacts: resultsCrmContacts,
      users: resultsUser,
      tasks: resultsTasks,
      projects: reslutsProjects,
    };

    return { data };
  } catch (error) {
    console.log("[FULLTEXT_SEARCH]", error);
    return { error: "Failed to perform search" };
  }
};
