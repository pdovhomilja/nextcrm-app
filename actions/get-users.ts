import { prismadb } from "@/lib/prisma";

export const getUsers = async () => {
  const data = await prismadb.users.findMany({});
  return data;
};
