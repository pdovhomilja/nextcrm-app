import { prismadb } from "@/lib/prisma";

export const getBoardsCount = async () => {
  const data = await prismadb.boards.count();
  return data;
};
