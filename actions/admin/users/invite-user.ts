"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Language, EmailSendProvider } from "@prisma/client";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import resendHelper from "@/lib/resend";
import { getPublicAppUrl } from "@/lib/app-url";
import {
  defaultWorkEmailForUsername,
  getOrgEmailDomain,
  isValidWorkEmail,
  slugifyUsername,
} from "@/lib/org-work-email";
import {
  generateTemporaryPassword,
  upsertCredentialAccount,
} from "@/lib/auth-credentials";
import { createEmailAccountForUser } from "@/actions/emails/accounts";
import EmployeeWelcomeEmail from "@/emails/EmployeeWelcome";

export type InviteEmployeeInput = {
  name: string;
  username: string;
  workEmail?: string;
  personalEmail: string;
  language: string;
};

export const inviteUser = async (data: InviteEmployeeInput) => {
  let actor;
  try {
    actor = await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  const inviter = await prismadb.users.findUnique({
    where: { id: actor.id },
    select: { name: true },
  });

  const { name, username, personalEmail, language } = data;
  const personal = personalEmail.trim().toLowerCase();
  const slug = slugifyUsername(username);

  if (!name?.trim()) return { error: "Display name is required" };
  if (!slug || slug.length < 2) return { error: "Username must be at least 2 characters (e.g. dhoni)" };
  if (!personal || !personal.includes("@")) return { error: "Valid personal email is required" };
  if (!language) return { error: "Language is required" };

  let workEmail: string;
  try {
    workEmail = (data.workEmail?.trim() || defaultWorkEmailForUsername(slug)).toLowerCase();
  } catch {
    return { error: "Could not build work email from username" };
  }

  if (!isValidWorkEmail(workEmail)) {
    return { error: `Work email must use your org domain (@${getOrgEmailDomain()})` };
  }

  let resend;
  try {
    resend = await resendHelper();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Resend API key is not configured";
    return { error: message };
  }

  const existingPersonal = await prismadb.users.findFirst({ where: { email: personal } });
  if (existingPersonal) return { error: "A user with this personal email already exists" };

  const existingWork = await prismadb.users.findFirst({ where: { workEmail } });
  if (existingWork) return { error: "This work email is already assigned to another user" };

  const existingMailbox = await prismadb.emailAccount.findFirst({
    where: { username: workEmail },
    select: { id: true },
  });
  if (existingMailbox) return { error: "This work email is already used as a CRM mailbox" };

  const temporaryPassword = generateTemporaryPassword();

  try {
    const user = await prismadb.users.create({
      data: {
        name: name.trim(),
        username: slug,
        email: personal,
        workEmail,
        userStatus: "ACTIVE",
        userLanguage: language as Language,
        role: "user",
        emailVerified: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        workEmail: true,
        username: true,
        avatar: true,
        role: true,
        userLanguage: true,
        userStatus: true,
        lastLoginAt: true,
      },
    });

    await upsertCredentialAccount(user.id, personal, temporaryPassword);

    try {
      await createEmailAccountForUser(user.id, {
        sendProvider: EmailSendProvider.RESEND,
        label: `${name.trim()} (${slug})`,
        fromName: name.trim(),
        username: workEmail,
      });
    } catch (mailboxError) {
      console.error("[INVITE_USER] Resend mailbox creation failed:", mailboxError);
      await prismadb.users.delete({ where: { id: user.id } });
      return {
        error:
          "User was not created — could not provision the Resend mailbox. Check RESEND_API_KEY and domain settings.",
      };
    }

    const appUrl = getPublicAppUrl();
    const appName = process.env.NEXT_PUBLIC_APP_NAME || "NextCRM";
    const fromAddress = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL;

    await resend.emails.send({
      from: `${appName} <${fromAddress}>`,
      to: personal,
      subject: `Your ${appName} login — ${workEmail}`,
      react: EmployeeWelcomeEmail({
        displayName: name.trim(),
        workEmail,
        personalEmail: personal,
        temporaryPassword,
        invitedByName: inviter?.name || "Your admin",
        appUrl,
        appName,
      }),
    });

    revalidatePath("/[locale]/(routes)/admin", "page");
    return { data: user };
  } catch (error) {
    console.log("[INVITE_USER]", error);
    return { error: "Failed to create employee" };
  }
};
