import { auth } from "@/auth";
import { getUserByEmail } from "../user";
import db from "@/lib/db";

export const getTasks = async () => {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("User session or email not found");
  }

  const user = await getUserByEmail(session.user.email);
  if (!user?.id) {
    throw new Error("User not found");
  }

  const tasks = await db.task.findMany({
    where: {
      createdBy: { cid: user.cid },
    },
  });
  return tasks;
};
