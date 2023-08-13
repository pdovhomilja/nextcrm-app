import { prismadb } from "@/lib/prisma";

export const getUsers = async () => {
  const data = await prismadb.users.findMany({
    orderBy: {
      created_on: "desc",
    },
  });
  return data;
};
