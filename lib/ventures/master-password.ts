import { timingSafeEqual } from "crypto";

/** Shared Ventures gate password (Production: set VENTURES_MASTER_PASSWORD on Vercel). */
export function getVenturesMasterPassword(): string | null {
  const primary = process.env.VENTURES_MASTER_PASSWORD?.trim();
  if (primary) return primary;
  // Legacy name from early Rofyt-only setup
  return process.env.ROFYT_ADMIN_PASSWORD?.trim() || null;
}

export function verifyVenturesMasterPassword(plain: string): boolean {
  const expected = getVenturesMasterPassword();
  if (!expected) return false;
  const a = Buffer.from(plain);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
