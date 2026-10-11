"use server";

import { prismadb } from "@/lib/prisma";
import { EmailSendProvider } from "@prisma/client";
import { requireRole, AuthorizationError, AuthenticationError } from "@/lib/authz";
import { normalizeEmailAddress } from "@/lib/email/resend-inbound";
import { revalidatePath } from "next/cache";

/** Keep the user's Resend mailbox address in sync with Users.workEmail (admin). */
export async function syncUserWorkEmailMailbox(userId: string, workEmail: string) {
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  const normalized = normalizeEmailAddress(workEmail);
  if (!normalized.includes("@")) return { error: "Invalid work email" };

  const account = await prismadb.emailAccount.findFirst({
    where: { userId, sendProvider: EmailSendProvider.RESEND },
    select: { id: true },
  });

  if (!account) return { error: "No Resend mailbox for this user" };

  const taken = await prismadb.emailAccount.findFirst({
    where: {
      username: normalized,
      NOT: { id: account.id },
    },
    select: { id: true },
  });
  if (taken) return { error: "That work email is already used by another mailbox" };

  await prismadb.$transaction([
    prismadb.users.update({
      where: { id: userId },
      data: { workEmail: normalized },
    }),
    prismadb.emailAccount.update({
      where: { id: account.id },
      data: { username: normalized },
    }),
  ]);

  revalidatePath("/[locale]/(routes)/admin/users", "page");
  revalidatePath("/[locale]/(routes)/admin/email-accounts", "page");
  return { data: { workEmail: normalized } };
}
