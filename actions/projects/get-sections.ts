import { prismadb } from "@/lib/prisma";

export const getSections = async () => {
  const data = await prismadb.sections.findMany({});

  return data;
};
