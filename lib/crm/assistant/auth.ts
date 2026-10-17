import { createHash, timingSafeEqual } from "crypto";

// A shorter ASSISTANT_TOKEN is treated as unset (fail closed) — it can't be a real secret.
const MIN_TOKEN_LENGTH = 32;

const digest = (s: string) => createHash("sha256").update(s).digest();

/**
 * Checks an `Authorization: Bearer <token>` header against ASSISTANT_TOKEN in
 * constant time. Both sides are hashed first so differing lengths don't
 * short-circuit (timingSafeEqual requires equal-length buffers).
 */
export function isAuthorizedAssistant(authHeader: string | null): boolean {
  const expected = process.env.ASSISTANT_TOKEN?.trim();
  if (!expected || expected.length < MIN_TOKEN_LENGTH) {
    console.error("[assistant-inquiry] ASSISTANT_TOKEN is unset or too short; rejecting");
    return false;
  }
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  return timingSafeEqual(digest(match[1].trim()), digest(expected));
}
