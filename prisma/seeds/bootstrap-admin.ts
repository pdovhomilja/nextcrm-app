import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "@prisma/client";

import { getBootstrapAdminSeedConfig } from "@/lib/bootstrap-admin-config";

/** Idempotent admin + credential account for local seed and `pnpm bootstrap:admin`. */
export async function seedBootstrapAdmin(prisma: PrismaClient) {
  const { email, workEmail, password, name } = getBootstrapAdminSeedConfig();
  const hashed = await hashPassword(password);

  const user = await prisma.users.upsert({
    where: { email },
    update: {
      name,
      role: "admin",
      userStatus: "ACTIVE",
      workEmail,
      emailVerified: true,
      mustChangePassword: false,
    },
    create: {
      email,
      workEmail,
      name,
      role: "admin",
      userStatus: "ACTIVE",
      emailVerified: true,
      mustChangePassword: false,
    },
  });

  const credential = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });

  if (credential) {
    await prisma.account.update({
      where: { id: credential.id },
      data: { accountId: email, password: hashed },
    });
  } else {
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: email,
        providerId: "credential",
        password: hashed,
      },
    });
  }

  console.log(`Bootstrap admin ready: ${email} (work: ${workEmail})`);
}
