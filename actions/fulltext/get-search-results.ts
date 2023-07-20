import { prismadb } from "@/lib/prisma";

export const getSearch = async (search: string) => {
  //Search in modul CRM (Oppotunities)
  const resultsCrmOpportunities = await prismadb.crm_Opportunities.findMany({
    where: {
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
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { account_name: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
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
    },
  };

  return data;
};
