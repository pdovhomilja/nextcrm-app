import { timingSafeEqual } from "crypto";

// Constant-time string comparison for shared secrets (same pattern as
// lib/crm/calendar/calendly-signature.ts). Only the length can differ in time.
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
