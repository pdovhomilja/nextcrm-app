"use server";
import { prismadb } from "@/lib/prisma";
import { DeleteContract } from "./schema";
import { InputType, ReturnType } from "./types";

import { createSafeAction } from "@/lib/create-safe-action";
import { writeAuditLog } from "@/lib/audit-log";
import {
  requireAuthenticated,
  assertCanWriteContract,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

const handler = async (data: InputType): Promise<ReturnType> => {
  const { id } = data;

  if (!id) {
    return {
      error: "Please fill in all the required fields.",
    };
  }

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "User not logged in." };
    throw e;
  }
  try {
    await assertCanWriteContract(user, id);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
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
