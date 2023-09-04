import { prismadb } from "@/lib/prisma";

export const getModules = async () => {
  const data = await prismadb.system_Modules_Enabled.findMany({
    orderBy: [{ position: "asc" }],
  });
  return data;
};
