import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  AuthenticationError,
} from "@/lib/authz";
import dayjs from "dayjs";

export const getTasksPastDue = async () => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return undefined;
    throw e;
  }
  const today = dayjs().startOf("day");
  const nextWeek = dayjs().add(7, "day").startOf("day");
  // user role: restrict to own tasks. manager/admin: global.
  const userScope =
    user.role === "user" ? [{ user: user.id }] : [];

  const getTaskPastDue = await prismadb.tasks.findMany({
    where: {
      AND: [
        ...userScope,
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
    include: {
      comments: {
        select: {
          id: true,
          comment: true,
          createdAt: true,
          assigned_user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  const getTaskPastDueInSevenDays = await prismadb.tasks.findMany({
    where: {
      AND: [
        ...userScope,
        {
          dueDateAt: {
            gt: today.toDate(),
            lt: nextWeek.toDate(),
          },
        },
        {
          taskStatus: {
            not: "COMPLETE",
          },
        },
      ],
    },
    include: {
      comments: {
        select: {
          id: true,
          comment: true,
          createdAt: true,
          assigned_user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  const data = {
    getTaskPastDue,
    getTaskPastDueInSevenDays,
  };

  return data;
};
