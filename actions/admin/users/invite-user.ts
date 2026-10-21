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
import { upsertCredentialAccount } from "@/lib/auth-credentials";
import { createEmailAccountForUser } from "@/actions/emails/accounts";

export type CreateEmployeeInput = {
  workEmail: string;
  password: string;
  role: string;
  name?: string;
  personalEmail?: string;
  phone?: string;
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
  const password = data.password?.trim() ?? "";
  const personal = data.personalEmail?.trim().toLowerCase() ?? "";
  const phone = data.phone?.trim() || null;
  const local = workEmail.split("@")[0] || "";
  const username = slugifyUsername(local);
  const name = data.name?.trim() || local || null;

  if (!role) return { error: "Select a valid role" };
  if (!isValidWorkEmail(workEmail)) {
    return { error: `Work email must use your org domain (@${getOrgEmailDomain()})` };
  }
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  if (personal && !isEmail(personal)) return { error: "Enter a valid personal email" };
  if (personal && personal === workEmail) {
    return { error: "Personal email must be different from the work email" };
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

  try {
    const user = await prismadb.users.create({
      data: {
        name,
        username: username || null,
        email: loginEmail,
        workEmail,
        phone,
        mustChangePassword: false,
        userStatus: "ACTIVE",
        userLanguage: "en",
        role,
        emailVerified: true,
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
