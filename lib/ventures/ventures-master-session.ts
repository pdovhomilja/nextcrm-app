import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "vensai_ventures_master";
const MAX_AGE_SEC = 60 * 60 * 12;

function secret(): string {
  const s = process.env.BETTER_AUTH_SECRET?.trim();
  if (!s) throw new Error("BETTER_AUTH_SECRET is required for venture sessions");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export async function setVenturesMasterSession(): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const body = `1.${exp}`;
  const token = `${body}.${sign(body)}`;
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearVenturesMasterSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function hasVenturesMasterSession(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [, expStr, sig] = parts;
  const exp = Number.parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const body = `1.${expStr}`;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
