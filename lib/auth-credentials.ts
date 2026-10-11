import { randomBytes } from "crypto";
import { hashPassword } from "better-auth/crypto";
import { prismadb } from "@/lib/prisma";

const PASSWORD_CHARS =
  "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";

export function generateTemporaryPassword(length = 14): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join("");
}

export async function hashUserPassword(password: string): Promise<string> {
  return hashPassword(password);
}

/** Better Auth credential provider row for email + password sign-in. */
export async function upsertCredentialAccount(userId: string, loginEmail: string, password: string) {
  const hashed = await hashUserPassword(password);
  const normalizedEmail = loginEmail.trim().toLowerCase();

  const existing = await prismadb.account.findFirst({
    where: { userId, providerId: "credential" },
  });

  if (existing) {
    return prismadb.account.update({
      where: { id: existing.id },
      data: {
        accountId: normalizedEmail,
        password: hashed,
      },
    });
  }

  return prismadb.account.create({
    data: {
      userId,
      accountId: normalizedEmail,
      providerId: "credential",
      password: hashed,
    },
  });
}
