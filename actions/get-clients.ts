import { prismadb } from "@/lib/prisma";

export const getClients = async () => {
  const data = await prismadb.clients.findMany({});
  return data;
};
