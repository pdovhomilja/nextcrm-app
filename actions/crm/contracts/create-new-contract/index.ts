"use server";
import { getSession } from "@/lib/auth-server";

import { prismadb } from "@/lib/prisma";
import { CreateNewContract } from "./schema";
import { InputType, ReturnType } from "./types";

import { createSafeAction } from "@/lib/create-safe-action";
import { writeAuditLog } from "@/lib/audit-log";
import { getSnapshotRate, getDefaultCurrency } from "@/lib/currency";

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
    currency,
  } = data;

  if (!title || !value) {
    return {
      error: "Please fill in all the required fields.",
    };
  }

  try {
    const defaultCurrency = await getDefaultCurrency();
    const snapshotRate = currency
      ? await getSnapshotRate(currency, defaultCurrency)
      : null;
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
        currency: currency || undefined,
        snapshot_rate: snapshotRate ? parseFloat(snapshotRate.toString()) : undefined,
      },
    });
    await writeAuditLog({
      entityType: "contract",
      entityId: result.id,
      action: "created",
      changes: null,
      userId: user.id,
    });
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
