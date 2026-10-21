"use server";

import { revalidatePath } from "next/cache";
import { EmailSendProvider } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
  parseRole,
} from "@/lib/authz";
import { getOrgEmailDomain, isValidWorkEmail } from "@/lib/org-work-email";
import { upsertCredentialAccount } from "@/lib/auth-credentials";
import { createEmailAccountForUser } from "@/actions/emails/accounts";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function requireAdmin() {
  try {
    return await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" as const };
    if (e instanceof AuthorizationError) return { error: "Forbidden" as const };
    throw e;
  }
}

export async function updateEmployee(input: {
  userId: string;
  name?: string;
  phone?: string;
  personalEmail?: string;
  workEmail?: string;
  password?: string;
  role?: string;
}) {
  const actor = await requireAdmin();
  if ("error" in actor) return actor;

  const userId = input.userId?.trim();
  if (!userId) return { error: "User is required" };

  const user = await prismadb.users.findUnique({
    where: { id: userId },
    select: { id: true, email: true, workEmail: true, name: true, role: true },
  });
  if (!user) return { error: "User not found" };

  const role = input.role === undefined ? undefined : parseRole(input.role);
  if (input.role !== undefined && !role) return { error: "Select a valid role" };
  if (actor.id === userId && user.role === "admin" && role && role !== "admin") {
    return { error: "You can't remove your own admin role" };
  }

  const currentWork = (user.workEmail || user.email).trim().toLowerCase();
  const nextWork = (input.workEmail ?? currentWork).trim().toLowerCase();
  if (!isValidWorkEmail(nextWork)) {
    return { error: `Work email must use your org domain (@${getOrgEmailDomain()})` };
  }

  const currentPersonal = user.email.trim().toLowerCase() === currentWork ? "" : user.email.trim().toLowerCase();
  const nextPersonal =
    input.personalEmail === undefined ? currentPersonal : input.personalEmail.trim().toLowerCase();
  if (nextPersonal && !isEmail(nextPersonal)) return { error: "Enter a valid personal email" };
  if (nextPersonal && nextPersonal === nextWork) {
    return { error: "Personal email must be different from the work email" };
  }

  const loginEmail = nextPersonal || nextWork;
  const password = input.password?.trim() ?? "";
  if (input.password !== undefined && password.length > 0 && password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const clash = await prismadb.users.findFirst({
    where: {
      id: { not: userId },
      OR: [
        { email: loginEmail },
        { email: nextWork },
        { workEmail: nextWork },
        ...(nextPersonal ? [{ email: nextPersonal }, { workEmail: nextPersonal }] : []),
      ],
    },
    select: { id: true },
  });
  if (clash) return { error: "Another user already uses that email" };

  const mailbox = await prismadb.emailAccount.findFirst({
    where: { userId, sendProvider: EmailSendProvider.RESEND },
    select: { id: true },
  });
  if (nextWork !== currentWork && mailbox) {
    const takenMailbox = await prismadb.emailAccount.findFirst({
      where: { username: nextWork, NOT: { id: mailbox.id } },
      select: { id: true },
    });
    if (takenMailbox) return { error: "That work email is already used by another mailbox" };
  }

  const name = input.name === undefined ? undefined : input.name.trim() || null;
  const phone = input.phone === undefined ? undefined : input.phone.trim() || null;

  try {
    await prismadb.users.update({
      where: { id: userId },
      data: {
        email: loginEmail,
        workEmail: nextWork,
        emailVerified: true,
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(role ? { role } : {}),
      },
    });

    const credential = await prismadb.account.findFirst({
      where: { userId, providerId: "credential" },
      select: { id: true },
    });
    if (credential) {
      await prismadb.account.update({
        where: { id: credential.id },
        data: { accountId: loginEmail },
      });
    }

    if (password) {
      await upsertCredentialAccount(userId, loginEmail, password);
      await prismadb.users.update({
        where: { id: userId },
        data: { mustChangePassword: false },
      });
    }

    if (mailbox && nextWork !== currentWork) {
      await prismadb.emailAccount.update({
        where: { id: mailbox.id },
        data: { username: nextWork },
      });
    } else if (!mailbox) {
      try {
        await createEmailAccountForUser(userId, {
          sendProvider: EmailSendProvider.RESEND,
          label: name || user.name || nextWork,
          fromName: name || user.name || nextWork.split("@")[0],
          username: nextWork,
        });
      } catch (mailboxError) {
        console.error("[UPDATE_EMPLOYEE] mailbox create failed:", mailboxError);
      }
    }
  } catch (e) {
    console.error("[UPDATE_EMPLOYEE]", e);
    return { error: "Failed to update user" };
  }

  revalidatePath("/[locale]/(routes)/admin/users", "page");
  return { data: { id: userId, email: loginEmail, workEmail: nextWork } };
}
