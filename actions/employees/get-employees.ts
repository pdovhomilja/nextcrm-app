import { prismadb } from "@/lib/prisma";

export const getEmployeesData = async (employeeId: string) => {
  const data = await prismadb.employee.findFirst({
    where: {
      id: employeeId,
    },     
  });
  return data;
};
