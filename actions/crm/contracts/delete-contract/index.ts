"use server";
import { getSession } from "@/lib/auth-server";

import { prismadb } from "@/lib/prisma";
import { DeleteContract } from "./schema";
import { InputType, ReturnType } from "./types";

import { createSafeAction } from "@/lib/create-safe-action";
import { writeAuditLog } from "@/lib/audit-log";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getSession();

  if (!session?.user?.email) {
    return {
      error: "User not logged in.",
    };
  }

  const user = await prismadb.users.findUnique({
    where: {
      email: session?.user?.email,
    },
  });

  if (!user) {
    return {
      error: "User not found.",
    };
  }

  const { id } = data;

  if (!id) {
    return {
      error: "Please fill in all the required fields.",
    };
  }

  try {
    await prismadb.crm_Contracts.update({
      where: { id: id },
      data: { deletedAt: new Date(), deletedBy: user.id },
    });
    await writeAuditLog({
      entityType: "contract",
      entityId: id,
      action: "deleted",
      changes: null,
      userId: user.id,
    });
  } catch (error) {
    console.log(error);
    return {
      error:
        "Something went wrong while trying to run DeleteContract action. Please try again.",
    };
  }

  return { data: { id } };
};

export const deleteContract = createSafeAction(DeleteContract, handler);
