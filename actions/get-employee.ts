import { prismadb } from "@/lib/prisma";

export const getEmployee = async () => {
  const data = await prismadb.employee.findMany({});
  return data;
};
