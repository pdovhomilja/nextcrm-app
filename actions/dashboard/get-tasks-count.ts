"use server";
import { prismadb } from "@/lib/prisma";

export const getTasksCount = async () => {
  const data = await prismadb.tasks.count();
  return data;
};

export const getUsersTasksCount = async (userId: string) => {
  const data = await prismadb.tasks.count({
    where: {
      user: userId,
    },
  });
  return data;
};
