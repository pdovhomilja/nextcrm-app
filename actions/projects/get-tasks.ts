import { prismadb } from "@/lib/prisma";

export const getTasks = async () => {
  const data = await prismadb.tasks.findMany({
    where: {
      id: "6495514120cd208681d939d6",
    },
    include: {
      assigned_user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  return data;
};
