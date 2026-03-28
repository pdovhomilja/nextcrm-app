import { prismadb } from "@/lib/prisma";

export const getContactCount = async () => {
  const data = await prismadb.crm_Contacts.count({ where: { deletedAt: null } });
  return data;
};
