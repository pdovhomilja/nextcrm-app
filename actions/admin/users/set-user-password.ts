"use server";

import { revalidatePath } from "next/cache";
import { prismadb } from "@/lib/prisma";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import resendHelper from "@/lib/resend";
import { getPublicAppUrl } from "@/lib/app-url";
import {
  generateTemporaryPassword,
  upsertCredentialAccount,
} from "@/lib/auth-credentials";
import EmployeeWelcomeEmail from "@/emails/EmployeeWelcome";
import { getAppName } from "@/lib/app-name";

export async function setUserPassword(input: {
  userId: string;
  password?: string;
  emailUser?: boolean;
}) {
  let actor;
  try {
    actor = await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  if (!input.userId) return { error: "userId is required" };

  const user = await prismadb.users.findUnique({
    where: { id: input.userId },
    select: { id: true, name: true, email: true, workEmail: true },
  });
  if (!user) return { error: "User not found" };

  const password =
    input.password?.trim() && input.password.trim().length >= 8
      ? input.password.trim()
      : generateTemporaryPassword();

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  try {
    await upsertCredentialAccount(user.id, user.email, password);
  } catch (e) {
    console.error("[SET_USER_PASSWORD]", e);
    return { error: "Failed to update password" };
  }

  if (input.emailUser !== false) {
    try {
      const resend = await resendHelper();
      const appUrl = getPublicAppUrl();
      const appName = getAppName();
      const fromAddress = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL;

      await resend.emails.send({
        from: `${appName} <${fromAddress}>`,
        to: user.email,
        subject: `Your ${appName} password was updated`,
        react: EmployeeWelcomeEmail({
          displayName: user.name || user.email,
          workEmail: user.workEmail || user.email,
          personalEmail: user.email,
          temporaryPassword: password,
          invitedByName: "Your administrator",
          appUrl,
          appName,
        }),
      });
    } catch (e) {
      console.error("[SET_USER_PASSWORD] email failed:", e);
      revalidatePath("/[locale]/(routes)/admin/users", "page");
      return { error: "Password updated but notification email failed to send" };
    }
  }

  revalidatePath("/[locale]/(routes)/admin/users", "page");
  return { data: { ok: true } };
}
