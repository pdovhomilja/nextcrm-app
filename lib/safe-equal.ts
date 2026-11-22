import { createHash, timingSafeEqual } from "crypto";

// Constant-time string comparison for shared secrets. Hashing first gives
// equal-length buffers, so the length of the secret does not leak either.
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
