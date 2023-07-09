import { prismadb } from "@/lib/prisma";

export const getTask = async (userId: string) => {
  const data = await prismadb.tasks.findFirst({
    where: {
      user: userId,
    },
  });
  return data;
};
