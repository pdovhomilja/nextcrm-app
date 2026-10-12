"use server";

import { revalidatePath } from "next/cache";

import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function updatePersonalEmail(input: { userId: string; personalEmail: string }) {
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  const userId = input.userId?.trim();
  const personal = input.personalEmail?.trim().toLowerCase() ?? "";

  if (!userId) return { error: "User is required" };
  if (!isEmail(personal)) return { error: "Enter a valid personal email address" };

  const user = await prismadb.users.findUnique({
    where: { id: userId },
    select: { id: true, email: true, workEmail: true },
  });
  if (!user) return { error: "User not found" };

  if (user.email === personal) {
    return { data: { email: personal } };
  }

  if (user.workEmail?.toLowerCase() === personal) {
    return { error: "Personal email must differ from the work email address" };
  }

  const taken = await prismadb.users.findFirst({
    where: { email: personal, NOT: { id: userId } },
    select: { id: true },
  });
  if (taken) return { error: "Another user already uses this personal email" };

  const oldEmail = user.email;

  try {
    await prismadb.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: userId },
        data: { email: personal, emailVerified: true },
      });
      const credential = await tx.account.findFirst({
        where: { userId, providerId: "credential" },
        select: { id: true },
      });
      if (credential) {
        await tx.account.update({
          where: { id: credential.id },
          data: { accountId: personal },
        });
      }
      await tx.verification.deleteMany({
        where: {
          identifier: { in: [`sign-in-otp-${oldEmail}`, `sign-in-otp-${personal}`] },
        },
      });
    });
  } catch (e) {
    console.error("[UPDATE_PERSONAL_EMAIL]", e);
    return { error: "Failed to update personal email" };
  }

  revalidatePath("/[locale]/(routes)/admin/users", "page");
  return { data: { email: personal } };
}
