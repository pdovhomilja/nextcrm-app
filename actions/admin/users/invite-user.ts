"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { EmailSendProvider } from "@prisma/client";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
  parseRole,
} from "@/lib/authz";
import { getOrgEmailDomain, isValidWorkEmail, slugifyUsername } from "@/lib/org-work-email";
import { generateTemporaryPassword, upsertCredentialAccount } from "@/lib/auth-credentials";
import { createEmailAccountForUser } from "@/actions/emails/accounts";
import { setUserVentureAccess } from "@/lib/vensai/user-access";
import { listVentureOptions } from "@/lib/vensai/venture-catalog";
import resendHelper from "@/lib/resend";
import { getPublicAppUrl } from "@/lib/app-url";
import EmployeeWelcomeEmail from "@/emails/EmployeeWelcome";
import { getAppName } from "@/lib/app-name";

export type CreateEmployeeInput = {
  workEmail: string;
  password?: string;
  role: string;
  name?: string;
  personalEmail?: string;
  phone?: string;
  ventureSlugs?: string[];
  crmEnabled?: boolean;
};

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

export const createEmployee = async (data: CreateEmployeeInput) => {
  const actor = await requireAdmin();
  if ("error" in actor) return actor;

  const role = parseRole(data.role);
  const workEmail = data.workEmail.trim().toLowerCase();
  const personal = data.personalEmail?.trim().toLowerCase() ?? "";
  const phone = data.phone?.trim() || null;
  const local = workEmail.split("@")[0] || "";
  const username = slugifyUsername(local);
  const name = data.name?.trim() || local || null;
  const suppliedPassword = data.password?.trim() ?? "";
  const hasPersonal = personal.length > 0;
  const generatedPassword = hasPersonal && suppliedPassword.length === 0;
  const password = generatedPassword ? generateTemporaryPassword() : suppliedPassword;
  const emailThePassword = hasPersonal;

  if (!role) return { error: "Select a valid role" };
  if (!isValidWorkEmail(workEmail)) {
    return { error: `Work email must use your org domain (@${getOrgEmailDomain()})` };
  }
  if (hasPersonal && !isEmail(personal)) return { error: "Enter a valid personal email" };
  if (hasPersonal && personal === workEmail) {
    return { error: "Personal email must be different from the work email" };
  }
  if (!hasPersonal && password.length < 8) {
    return { error: "Set a password. Personal email is empty." };
  }
  if (suppliedPassword.length > 0 && suppliedPassword.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }
  const fromAddress = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "";
  if (emailThePassword && !fromAddress) {
    return { error: "Email sending is not configured, so the password cannot be delivered" };
  }

  const loginEmail = personal || workEmail;

  const taken = await prismadb.users.findFirst({
    where: {
      OR: [
        { email: loginEmail },
        { email: workEmail },
        { workEmail },
        ...(personal ? [{ email: personal }, { workEmail: personal }] : []),
      ],
    },
    select: { id: true },
  });
  if (taken) return { error: `${workEmail} is already used by another user` };

  const existingMailbox = await prismadb.emailAccount.findFirst({
    where: { username: workEmail },
    select: { id: true },
  });
  if (existingMailbox) return { error: "This work email is already used as a CRM mailbox" };

  const allowedVentures = new Set(listVentureOptions().map((v) => v.slug));
  const ventureSlugs = (data.ventureSlugs ?? []).filter((s) => allowedVentures.has(s));
  const crmEnabled = data.crmEnabled !== false;
  if (!crmEnabled && ventureSlugs.length === 0) {
    return { error: "Enable CRM access or assign at least one venture." };
  }

  try {
    const user = await prismadb.users.create({
      data: {
        name,
        username: username || null,
        email: loginEmail,
        workEmail,
        phone,
        mustChangePassword: generatedPassword,
        userStatus: "ACTIVE",
        userLanguage: "en",
        role,
        emailVerified: true,
        crmEnabled,
      },
      select: { id: true, email: true, workEmail: true, name: true, role: true },
    });

    await upsertCredentialAccount(user.id, loginEmail, password);

    try {
      await createEmailAccountForUser(user.id, {
        sendProvider: EmailSendProvider.RESEND,
        label: name || workEmail,
        fromName: name || local,
        username: workEmail,
      });
    } catch (mailboxError) {
      console.error("[CREATE_EMPLOYEE] mailbox failed:", mailboxError);
      await prismadb.users.delete({ where: { id: user.id } });
      const message = mailboxError instanceof Error ? mailboxError.message : "Could not create the mailbox";
      return { error: `${workEmail}: ${message}` };
    }

    if (emailThePassword) {
      try {
        const resend = await resendHelper();
        const appName = getAppName();
        const inviter = await prismadb.users.findUnique({
          where: { id: actor.id },
          select: { name: true },
        });
        await resend.emails.send({
          from: `${appName} <${fromAddress}>`,
          to: personal,
          subject: `Your ${appName} login — ${workEmail}`,
          react: EmployeeWelcomeEmail({
            displayName: name || personal,
            workEmail,
            personalEmail: personal,
            temporaryPassword: password,
            mustChange: generatedPassword,
            invitedByName: inviter?.name || "Your administrator",
            appUrl: getPublicAppUrl(),
            appName,
          }),
        });
      } catch (mailError) {
        console.error("[CREATE_EMPLOYEE] welcome email failed:", mailError);
        await prismadb.users.delete({ where: { id: user.id } });
        return { error: `Could not email the password to ${personal}` };
      }
    }

    await setUserVentureAccess({ userId: user.id, ventureSlugs, crmEnabled });
    revalidatePath("/[locale]/(routes)/admin", "page");
    revalidatePath("/[locale]/(routes)/ventures", "page");
    return { data: user };
  } catch (error) {
    console.error("[CREATE_EMPLOYEE]", error);
    return { error: `Failed to create ${workEmail}` };
  }
};

export const inviteUser = async (data: CreateEmployeeInput) => {
  const result = await createEmployee(data);
  if (!("error" in result)) {
    revalidatePath("/[locale]/(routes)/admin/users", "page");
  }
  return result;
};
