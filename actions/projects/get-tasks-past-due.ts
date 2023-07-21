import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import dayjs from "dayjs";
import { getServerSession } from "next-auth";

export const getTasksPastDue = async () => {
  const session = await getServerSession(authOptions);
  const today = dayjs().startOf("day");
  const nextWeek = dayjs().add(7, "day").startOf("day");
  if (session) {
    const getTaskPastDue = await prismadb.tasks.findMany({
      where: {
        AND: [
          {
            user: session.user.id,
          },
          {
            dueDateAt: {
              lte: new Date(),
            },
          },
          {
            taskStatus: {
              not: "COMPLETE",
            },
          },
        ],
      },
    });

    const getTaskPastDueInSevenDays = await prismadb.tasks.findMany({
      where: {
        AND: [
          {
            user: session.user.id,
          },
          {
            dueDateAt: {
              //lte: dayjs().add(7, "day").toDate(),
              gt: today.toDate(), // Due date is greater than or equal to today
              lt: nextWeek.toDate(), // Due date is less than next week (not including today)
            },
          },
          {
            taskStatus: {
              not: "COMPLETE",
            },
          },
        ],
      },
    });

    const data = {
      getTaskPastDue,
      getTaskPastDueInSevenDays,
    };

    return data;
  }
};
