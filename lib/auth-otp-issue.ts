import { randomInt } from "crypto";

import { resolveLoginIdentity } from "@/lib/auth-login-email";
import { OTP_EXPIRES_SECONDS, sendOtpEmail } from "@/lib/auth-otp-mail";
import { prismadb } from "@/lib/prisma";

export const OTP_RESEND_COOLDOWN_SECONDS = 30;
const MAX_ATTEMPTS = 5;

export type IssueSignInOtpResult =
  | { ok: true; retryAfterSeconds: number; authEmail: string }
  | { error: string; retryAfterSeconds?: number };

function signInOtpIdentifier(email: string) {
  return `sign-in-otp-${email}`;
}

function parseStoredOtp(value: string): { otp: string; attempts: number } | null {
  const idx = value.lastIndexOf(":");
  const otp = idx === -1 ? value : value.slice(0, idx);
  const attemptsRaw = idx === -1 ? "0" : value.slice(idx + 1);
  if (!/^\d{6}$/.test(otp)) return null;
  const attempts = Number.parseInt(attemptsRaw, 10);
  if (!Number.isFinite(attempts)) return null;
  return { otp, attempts };
}

function generateOtp() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Emails a sign-in code, then stores it against the account email Better Auth
 * verifies. A work address still delivers the code to that inbox.
 * A failed send leaves any previous code in place.
 * A resend within the expiry window emails that same code again.
 */
export async function issueSignInOtp(rawEmail: string): Promise<IssueSignInOtpResult> {
  if (typeof rawEmail !== "string" || !rawEmail.trim()) {
    return { error: "Enter a valid email address." };
  }

  try {
    const identity = await resolveLoginIdentity(rawEmail);
    if ("error" in identity) return identity;

    const { authEmail, deliverTo } = identity;
    const identifier = signInOtpIdentifier(authEmail);
    const now = new Date();
    const existing = await prismadb.verification.findFirst({
      where: { identifier },
      orderBy: { createdAt: "desc" },
    });
    const parsed = existing ? parseStoredOtp(existing.value) : null;
    const reusable = Boolean(
      existing &&
        parsed &&
        existing.expiresAt > now &&
        parsed.attempts < MAX_ATTEMPTS
    );

    if (reusable && existing) {
      const sentAt = existing.updatedAt ?? existing.createdAt;
      if (sentAt) {
        const elapsedSeconds = (now.getTime() - sentAt.getTime()) / 1000;
        if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
          const retryAfterSeconds = Math.max(
            1,
            Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds)
          );
          return {
            error: `A code was just sent. Wait ${retryAfterSeconds}s, then check your inbox and spam folder.`,
            retryAfterSeconds,
          };
        }
      }
    }

    const otp = reusable && parsed ? parsed.otp : generateOtp();

    try {
      await sendOtpEmail(deliverTo, otp);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not send the verification email.";
      return { error: message };
    }

    const expiresAt = new Date(now.getTime() + OTP_EXPIRES_SECONDS * 1000);

    if (reusable && existing) {
      await prismadb.verification.update({
        where: { id: existing.id },
        data: { expiresAt, updatedAt: now },
      });
      await prismadb.verification.deleteMany({
        where: { identifier, id: { not: existing.id } },
      });
    } else {
      await prismadb.verification.deleteMany({ where: { identifier } });
      await prismadb.verification.create({
        data: {
          identifier,
          value: `${otp}:0`,
          expiresAt,
          createdAt: now,
          updatedAt: now,
        },
      });
    }

    return { ok: true, retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS, authEmail };
  } catch (error) {
    console.error("[issueSignInOtp]", error);
    const message =
      error instanceof Error ? error.message : "Could not send the verification code.";
    return { error: message };
  }
}
