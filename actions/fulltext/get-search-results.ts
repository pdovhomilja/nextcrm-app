"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const getSearch = async (search: string) => {
  //TODO: This action is now offtopic, because it is not used in the frontend.

  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  //Search in modul CRM (Oppotunities)
  const resultsCrmOpportunities = await prismadb.crm_Opportunities.findMany({
    where: {
      organizationId: session.user.organizationId,
      OR: [
        { description: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        // add more fields as needed
      ],
    },
  });

  //Search in modul CRM (Accounts)
  const resultsCrmAccounts = await prismadb.crm_Accounts.findMany({
    where: {
      organizationId: session.user.organizationId,
      OR: [
        { description: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        // add more fields as needed
      ],
    },
  });

  //Search in modul CRM (Contacts)
  const resultsCrmContacts = await prismadb.crm_Contacts.findMany({
    where: {
      organizationId: session.user.organizationId,
      OR: [
        { last_name: { contains: search, mode: "insensitive" } },
        { first_name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        // add more fields as needed
      ],
    },
  });

  //Search in local user database
  const resultsUser = await prismadb.users.findMany({
    where: {
      organizationId: session.user.organizationId,
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { account_name: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        // add more fields as needed
      ],
    },
  });

  const resultsTasks = await prismadb.tasks.findMany({
    where: {
      organizationId: session.user.organizationId,
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        // add more fields as needed
      ],
    },
  });

  const reslutsProjects = await prismadb.boards.findMany({
    where: {
      organizationId: session.user.organizationId,
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        // add more fields as needed
      ],
    },
  });

  const data = {
    message: "Fulltext search response",
    results: {
      opportunities: resultsCrmOpportunities,
      accounts: resultsCrmAccounts,
      contacts: resultsCrmContacts,
      users: resultsUser,
      tasks: resultsTasks,
      projects: reslutsProjects,
    },
  };

  return data;
};
