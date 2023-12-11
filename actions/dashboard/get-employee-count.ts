import { prismadb } from "@/lib/prisma";

export const getEmployeeCount = async () => {
  const data = await prismadb.employee.count();
  return data;
};
