import { prismadb } from "@/lib/prisma";

export const getUsers = async () => {
  const data = await prismadb.users.findMany({
    orderBy: {
      created_on: "desc",
    },
    where: {
      userStatus: "ACTIVE",
    },
  });
  return data;
};

//Get new users by month for chart
export const getUsersByMonth = async () => {
  const users = await prismadb.users.findMany({
    select: {
      created_on: true,
    },
  });

  if (!users) {
    return {};
  }

  const usersByMonth = users.reduce((acc: any, user: any) => {
    const month = new Date(user.created_on).toLocaleString("default", {
      month: "long",
    });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.keys(usersByMonth).map((month) => {
    return {
      name: month,
      Number: usersByMonth[month],
    };
  });

  return chartData;
};
