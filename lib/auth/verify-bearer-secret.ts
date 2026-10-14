import { timingSafeEqual } from "crypto";

export function verifyBearerSecret(
  authorizationHeader: string | null | undefined,
  secret: string
): boolean {
  if (!authorizationHeader?.startsWith("Bearer ")) return false;
  const token = authorizationHeader.slice("Bearer ".length).trim();
  if (!token || !secret) return false;

  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length) return false;

  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
