import { auth } from "@/auth";
import { getUserByEmail } from "../user";
import { getCurrentCompanyId } from "@/lib/auth-utils";
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

  // Get current company ID for multi-tenant isolation
  const companyId = await getCurrentCompanyId();

  // Get tasks from boards that belong to the user's company
  const tasks = await db.task.findMany({
    where: {
      boardSection: {
        board: {
          companyId: companyId, // Multi-tenant isolation
        },
      },
    },
    include: {
      assignedTo: true,
      createdBy: true,
      boardSection: {
        include: {
          board: true,
        },
      },
    },
  });
  return tasks;
};
