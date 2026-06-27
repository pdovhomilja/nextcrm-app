import ky, { type KyInstance } from "ky";
import { Client } from "pg";

const BASE_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const SESSION_COOKIE = "better-auth.session_token";

export interface IntegrationSession {
  cookie: string;
  userId: string;
  email: string;
}

function http(): KyInstance {
  return ky.create({
    prefix: BASE_URL,
    timeout: 15_000,
    retry: { limit: 2, methods: ["get", "post"] },
  });
}

export { http };

function extractSessionCookie(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;

  const cookiePairs = setCookieHeader
    .split(/,(?=[^;]+=)/g)
    .map((part) => part.split(";")[0]?.trim() ?? "")
    .filter(Boolean);

  for (const pair of cookiePairs) {
    if (pair.startsWith(`${SESSION_COOKIE}=`) || pair.startsWith(`__Secure-${SESSION_COOKIE}=`)) {
      return pair;
    }
  }
  return null;
}

async function clearOtpRows(email: string): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('DELETE FROM "verification" WHERE identifier LIKE $1', [`%-otp-${email}`]);
  } finally {
    await client.end();
  }
}

export async function requestSignInOtp(email: string): Promise<void> {
  const resp = await http().post("api/auth/email-otp/send-verification-otp", {
    json: { email, type: "sign-in" },
    throwHttpErrors: false,
  });
  if (resp.status !== 200) {
    throw new Error(`[integration auth] send-verification-otp failed for ${email}: HTTP ${resp.status}`);
  }
}

export async function getCapturedOtp(email: string): Promise<string | null> {
  const resp = await http().get("api/auth/test-otp", {
    searchParams: { email },
    throwHttpErrors: false,
  });
  if (resp.status === 200) {
    const body = (await resp.json()) as { otp?: string };
    return body.otp ?? null;
  }
  if (resp.status === 404) return null;
  throw new Error(`[integration auth] test-otp lookup failed: HTTP ${resp.status}`);
}

export async function signInAsAdmin(): Promise<IntegrationSession> {
  return signInAs(process.env.TEST_USER_EMAIL ?? "admin@example.com");
}

export async function signInAs(email: string): Promise<IntegrationSession> {
  await clearOtpRows(email);
  await requestSignInOtp(email);

  let otp: string | null = null;
  for (let attempt = 0; attempt < 20 && !otp; attempt++) {
    otp = await getCapturedOtp(email);
    if (!otp) await new Promise((r) => setTimeout(r, 100));
  }
  if (!otp) {
    throw new Error(`[integration auth] no OTP captured for ${email} after 2s — is NODE_ENV != production?`);
  }

  const verifyResp = await http().post("api/auth/sign-in/email-otp", {
    json: { email, otp },
    throwHttpErrors: false,
  });
  if (verifyResp.status !== 200) {
    const errorBody = await verifyResp.text();
    throw new Error(
      `[integration auth] verify-otp failed for ${email}: HTTP ${verifyResp.status} - Body: ${errorBody}`,
    );
  }

  const setCookie =
    verifyResp.headers.get("set-cookie") ??
    Array.from(verifyResp.headers.entries())
      .filter(([k]) => k.toLowerCase() === "set-cookie")
      .map(([, v]) => v)
      .join(", ");

  const cookie = extractSessionCookie(setCookie);
  if (!cookie) {
    throw new Error(
      `[integration auth] verify-otp returned 200 but no ${SESSION_COOKIE} cookie was set. ` +
        `Set-Cookie present: ${Boolean(setCookie)}`,
    );
  }

  const meResp = await http().get("api/auth/get-session", {
    headers: { cookie },
    throwHttpErrors: false,
  });
  if (meResp.status !== 200) {
    throw new Error(`[integration auth] get-session failed with HTTP ${meResp.status}`);
  }
  const me = (await meResp.json()) as { user?: { id: string; email: string } };

  return {
    cookie,
    userId: me.user?.id ?? "",
    email: me.user?.email ?? email,
  };
}

export function httpAs(session: IntegrationSession): KyInstance {
  return http().extend({
    headers: { cookie: session.cookie },
  });
}
