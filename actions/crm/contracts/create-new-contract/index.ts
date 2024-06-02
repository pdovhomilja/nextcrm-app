"use server";

import { prismadb } from "@/lib/prisma";
import { CreateNewContract } from "./schema";
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

  const {
    title,
    value,
    startDate,
    endDate,
    renewalReminderDate,
    customerSignedDate,
    companySignedDate,
    description,
    account,
    assigned_to,
  } = data;

  if (!title || !value) {
    return {
      error: "Please fill in all the required fields.",
    };
  }

  try {
    const result = await prismadb.crm_Contracts.create({
      data: {
        v: 0,
        title,
        value: parseFloat(value),
        startDate,
        endDate,
        renewalReminderDate,
        customerSignedDate,
        companySignedDate,
        description,
        account: account || undefined,
        assigned_to: assigned_to || undefined,
        createdBy: user.id,
      },
    });
    //console.log(result, "result");
  } catch (error) {
    console.log(error);
    return {
      error:
        "Something went wrong while trying to run CreateNewContract action. Please try again.",
    };
  }

  return { data: { title } };
};

export const createNewContract = createSafeAction(CreateNewContract, handler);
