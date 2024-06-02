"use server";

import { prismadb } from "@/lib/prisma";
import { DeleteContract } from "./schema";
import { InputType, ReturnType } from "./types";

import { createSafeAction } from "@/lib/create-safe-action";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session: Session | null = await getServerSession(authOptions);

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
    const result = await prismadb.crm_Contracts.delete({
      where: {
        id: id,
      },
    });
    console.log(result, "result");
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
