import { decrypt, encrypt } from "@/lib/email-crypto";

export function encryptVentureEnv(plain: string): string | null {
  const trimmed = plain.trim();
  if (!trimmed) return null;
  return encrypt(trimmed);
}

export function decryptVentureEnv(cipher: string | null | undefined): string {
  if (!cipher?.trim()) return "";
  try {
    return decrypt(cipher);
  } catch {
    return "";
  }
}
