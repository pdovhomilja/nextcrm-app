"use server";
import { getSession } from "@/lib/auth-server";

import { prismadb } from "@/lib/prisma";
import { UpdateContract } from "./schema";
import { InputType, ReturnType } from "./types";

import { createSafeAction } from "@/lib/create-safe-action";
import { writeAuditLog, diffObjects } from "@/lib/audit-log";
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
    currency,
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

  const before = await prismadb.crm_Contracts.findUnique({ where: { id, deletedAt: null } });

  try {
    const defaultCurrency = await getDefaultCurrency();
    const snapshotRate = currency
      ? await getSnapshotRate(currency, defaultCurrency)
      : null;
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
        currency: currency || undefined,
        snapshot_rate: snapshotRate ? parseFloat(snapshotRate.toString()) : undefined,
      },
    });

    const changes = before ? diffObjects(before as Record<string, unknown>, result as Record<string, unknown>) : null;
    await writeAuditLog({
      entityType: "contract",
      entityId: result.id,
      action: "updated",
      changes,
      userId: user.id,
    });
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
