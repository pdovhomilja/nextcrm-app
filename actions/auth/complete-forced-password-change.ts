"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { upsertCredentialAccount } from "@/lib/auth-credentials";
import { prismadb } from "@/lib/prisma";

const MIN_PASSWORD_LENGTH = 8;

/** Required after first sign-in with a temporary password or OTP. */
export async function completeForcedPasswordChange(input: {
  newPassword: string;
  confirmPassword: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { error: "Sign in to continue." };
  }

  const newPassword = input.newPassword.trim();
  const confirmPassword = input.confirmPassword.trim();

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const user = await prismadb.users.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, mustChangePassword: true },
  });
  if (!user?.email) {
    return { error: "Account not found." };
  }
  if (!user.mustChangePassword) {
    return { error: "Password change is not required for this account." };
  }

  try {
    await upsertCredentialAccount(user.id, user.email, newPassword);
    await prismadb.users.update({
      where: { id: user.id },
      data: { mustChangePassword: false },
    });
  } catch (e) {
    console.error("[completeForcedPasswordChange]", e);
    return { error: "Could not update password. Try again." };
  }

  revalidatePath("/", "layout");
  return { ok: true as const };
}
