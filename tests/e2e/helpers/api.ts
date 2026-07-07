import type { Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";

export async function requestOtp(email: string): Promise<void> {
  const resp = await fetch(`${BASE_URL}/api/auth/email-otp/send-verification-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, type: "sign-in" }),
  });
  if (!resp.ok) throw new Error(`requestOtp failed: ${resp.status}`);
}

export async function getOtp(email: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const resp = await fetch(`${BASE_URL}/api/auth/test-otp?email=${email}`);
    if (resp.ok) {
      const body = (await resp.json()) as { otp?: string };
      if (body.otp) return body.otp;
    }
  }
  throw new Error(`OTP not captured for ${email}`);
}

export async function verifyOtp(email: string, otp: string): Promise<string> {
  const resp = await fetch(`${BASE_URL}/api/auth/sign-in/email-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  if (!resp.ok) throw new Error(`verifyOtp failed: ${resp.status}`);

  const setCookie = resp.headers.get("set-cookie") ?? "";
  const cookiePair = setCookie
    .split(/,(?=[^;]+=)/g)
    .map((p) => p.split(";")[0]?.trim() ?? "")
    .find((c) => c.startsWith("better-auth.session_token="));

  if (!cookiePair) throw new Error("Session cookie not found");
  return cookiePair;
}

export async function injectCookie(page: Page, cookiePair: string): Promise<void> {
  const parts = cookiePair.split("=");
  const name = parts[0];
  const value = parts.slice(1).join("=");
  if (name) {
    await page.context().addCookies([{ name, value, domain: "localhost", path: "/" }]);
  }
}

export async function signInViaApi(page: Page, email: string): Promise<void> {
  await requestOtp(email);
  const otp = await getOtp(email);
  const cookie = await verifyOtp(email, otp);
  await injectCookie(page, cookie);
}
