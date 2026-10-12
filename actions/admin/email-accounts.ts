"use server";

import { revalidatePath } from "next/cache";
import { prismadb } from "@/lib/prisma";
import { requireRole, AuthorizationError } from "@/lib/authz";
import { serializeDecimalsList } from "@/lib/serialize-decimals";
import {
  createEmailAccountForUser,
  type CreateEmailAccountInput,
} from "@/actions/emails/accounts";
import { inngest } from "@/inngest/client";

async function requireAdmin() {
  try {
    return await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw new Error("Unauthorized");
  }
}

export async function getAdminEmailAccounts() {
  await requireAdmin();
  const accounts = await prismadb.emailAccount.findMany({
    select: {
      id: true,
      label: true,
      imapHost: true,
      imapPort: true,
      imapSsl: true,
      smtpHost: true,
      smtpPort: true,
      smtpSsl: true,
      username: true,
      sendProvider: true,
      fromName: true,
      isActive: true,
      allowSelfSignedTls: true,
      sentFolderName: true,
      lastSyncedAt: true,
      createdAt: true,
      user: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: [{ user: { email: "asc" } }, { createdAt: "asc" }],
  });
  return serializeDecimalsList(accounts);
}

export async function getUsersForEmailAccountAssignment() {
  await requireAdmin();
  const users = await prismadb.users.findMany({
    where: { userStatus: "ACTIVE" },
    select: { id: true, email: true, name: true },
    orderBy: { email: "asc" },
  });
  return users;
}

export async function adminCreateEmailAccount(userId: string, input: CreateEmailAccountInput) {
  await requireAdmin();
  if (!userId?.trim()) throw new Error("User is required");

  const user = await prismadb.users.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const account = await createEmailAccountForUser(userId, input);
  revalidatePath("/[locale]/(routes)/admin/email-accounts", "page");
  return account;
}

export async function adminDeleteEmailAccount(id: string) {
  await requireAdmin();
  const account = await prismadb.emailAccount.findUnique({ where: { id }, select: { id: true } });
  if (!account) throw new Error("Not found");
  await prismadb.emailAccount.delete({ where: { id } });
  revalidatePath("/[locale]/(routes)/admin/email-accounts", "page");
}

export async function adminSetEmailAccountActive(id: string, isActive: boolean) {
  await requireAdmin();
  const account = await prismadb.emailAccount.findUnique({ where: { id }, select: { id: true } });
  if (!account) throw new Error("Not found");
  await prismadb.emailAccount.update({ where: { id }, data: { isActive } });
  revalidatePath("/[locale]/(routes)/admin/email-accounts", "page");
}

export async function adminTriggerEmailSync(accountId: string) {
  await requireAdmin();
  const account = await prismadb.emailAccount.findUnique({
    where: { id: accountId },
    select: { id: true },
  });
  if (!account) throw new Error("Account not found");
  await inngest.send({ name: "email/sync-account", data: { accountId } });
}
