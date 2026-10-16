import bcrypt from "bcryptjs";

export async function hashVenturePassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyVenturePassword(
  plain: string,
  hash: string | null | undefined
): Promise<boolean> {
  if (!hash?.trim()) return false;
  return bcrypt.compare(plain, hash);
}
