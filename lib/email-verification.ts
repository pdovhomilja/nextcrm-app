import { randomBytes } from "crypto";
import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

export async function generateEmailVerificationToken(email: string): Promise<string> {
  // Generate a secure random token
  const token = randomBytes(32).toString("hex");
  
  // Set expiration to 24 hours from now
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Update user with verification token
  await prisma.user.update({
    where: { email },
    data: {
      emailVerificationToken: token,
      emailTokenExpires: expires,
    },
  });

  return token;
}

export async function verifyEmailToken(token: string): Promise<{ success: boolean; email?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      return { success: false };
    }

    // Check if token has expired
    if (user.emailTokenExpires && user.emailTokenExpires < new Date()) {
      return { success: false };
    }

    // Mark email as verified and clear verification token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerificationToken: null,
        emailTokenExpires: null,
      },
    });

    return { success: true, email: user.email };
  } catch (error) {
    console.error("Email verification error:", error);
    return { success: false };
  }
}

export function getVerificationUrl(token: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl}/api/verify-email?token=${token}`;
}