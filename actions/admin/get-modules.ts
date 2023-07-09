import { prismadb } from "@/lib/prisma";

export const getUsers = async () => {
  const data = await prismadb.system_Modules_Enabled.findMany({
    orderBy: [{ position: "asc" }],
  });
  return data;
};
