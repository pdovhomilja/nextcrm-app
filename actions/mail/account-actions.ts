"use server";

import { auth } from "@/auth";
import db from "@/lib/db";
import { encrypt, decrypt } from "@/lib/security/encryption";
import { z } from "zod";

const mailAccountSchema = z.object({
  email: z.string().email(),
  imapHost: z.string().min(1),
  imapPort: z.number().int(),
  imapUser: z.string().min(1),
  password: z.string().min(1),
  smtpHost: z.string().min(1),
  smtpPort: z.number().int(),
});

export async function saveUserMailAccount(data: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const validatedData = mailAccountSchema.safeParse(data);
  if (!validatedData.success) {
    return { error: "Invalid data", details: validatedData.error.flatten() };
  }

  const { password, ...restOfData } = validatedData.data;

  try {
    const encryptedPassword = encrypt(password);

    await db.userMailAccount.create({
      data: {
        ...restOfData,
        encryptedPassword,
        userId: session.user.id,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to save mail account:", error);
    return { error: "Could not save mail account." };
  }
}

export async function getUserMailAccounts() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const accounts = await db.userMailAccount.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        email: true,
        imapHost: true,
        imapPort: true,
        imapUser: true,
        smtpHost: true,
        smtpPort: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    return { accounts };
  } catch (error) {
    console.error("Failed to get mail accounts:", error);
    return { error: "Could not retrieve mail accounts." };
  }
}

export async function deleteUserMailAccount(accountId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (!accountId) {
    return { error: "Account ID is required." };
  }

  try {
    await db.userMailAccount.delete({
      where: {
        id: accountId,
        userId: session.user.id, // Ensures users can only delete their own accounts
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to delete mail account:", error);
    return { error: "Could not delete mail account." };
  }
}
