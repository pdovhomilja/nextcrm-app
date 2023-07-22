import { prismadb } from "@/lib/prisma";

export const getContacts = async () => {
  const data = await prismadb.crm_Contacts.findMany({});
  return data;
};
