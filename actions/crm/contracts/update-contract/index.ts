"use server";

import { prismadb } from "@/lib/prisma";
import { UpdateContract } from "./schema";
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
    id,
    v,
    title,
    value,
    startDate,
    endDate,
    renewalReminderDate,
    customerSignedDate,
    companySignedDate,
    description,
    status,
    account,
    assigned_to,
  } = data;

  if (!id) {
    return {
      error: "No contract ID provided.",
    };
  }

  if (!title || !value) {
    return {
      error: "Please fill in all the required fields.",
    };
  }

  try {
    const result = await prismadb.crm_Contracts.update({
      where: {
        id: data.id,
      },
      data: {
        v: data.v + 1,
        title,
        value: parseFloat(value),
        startDate,
        endDate,
        renewalReminderDate,
        customerSignedDate,
        companySignedDate,
        description,
        status,
        account: account || undefined,
        assigned_to: assigned_to || undefined,
        createdBy: user.id,
      },
    });

    //console.log("Result: ", result);
  } catch (error) {
    console.log(error);
    return {
      error:
        "Something went wrong while trying to run UpdateContract action. Please try again.",
    };
  }

  return { data: { title } };
};

export const updateContract = createSafeAction(UpdateContract, handler);
