import "server-only";

import { getToken, startAuthorization, UserAuthorizationRequiredError } from "@vercel/connect";
import { headers } from "next/headers";

export const LINKEDIN_CONNECTOR_UID = "linkedin/vensai-crm-linkedin";

/** Org scopes need LinkedIn Community Management API approval and often break OIDC on the same app. */
const LINKEDIN_ORG_SCOPES = [
  "r_organization_admin",
  "r_organization_social",
  "rw_organization_admin",
] as const;

const LINKEDIN_BASE_SCOPES = ["openid", "profile", "email"] as const;

function parseLinkedInScopes(): string[] {
  const fromEnv = process.env.LINKEDIN_OAUTH_SCOPES?.trim();
  if (fromEnv) {
    return fromEnv.split(/[\s,]+/).filter(Boolean);
  }
  if (process.env.LINKEDIN_ORG_SCOPES === "true") {
    return [...LINKEDIN_BASE_SCOPES, ...LINKEDIN_ORG_SCOPES];
  }
  return [...LINKEDIN_BASE_SCOPES];
}

export const LINKEDIN_SCOPES = parseLinkedInScopes();

async function getOrigin() {
  if (process.env.NODE_ENV !== "production" && process.env.V0_RUNTIME_URL) return process.env.V0_RUNTIME_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  return `${requestHeaders.get("x-forwarded-proto") ?? "https"}://${host}`;
}

export async function getLinkedInSubject(userId: string) {
  return { type: "user" as const, id: userId };
}

export async function beginLinkedInAuthorization(userId: string) {
  const origin = await getOrigin();
  return startAuthorization(
    LINKEDIN_CONNECTOR_UID,
    { subject: await getLinkedInSubject(userId), scopes: LINKEDIN_SCOPES },
    { callbackUrl: `${origin}/api/linkedin/callback` },
  );
}

export async function getLinkedInAccessToken(userId: string) {
  return getToken(LINKEDIN_CONNECTOR_UID, {
    subject: await getLinkedInSubject(userId),
    scopes: LINKEDIN_SCOPES,
  });
}

export { UserAuthorizationRequiredError };

export async function linkedInFetch<T>(userId: string, path: string, init?: RequestInit): Promise<T> {
  const token = await getLinkedInAccessToken(userId);
  const response = await fetch(`https://api.linkedin.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": "202601",
      "X-Restli-Protocol-Version": "2.0.0",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`LinkedIn API returned ${response.status}`);
  return response.json() as Promise<T>;
}

export function isLinkedInAuthorizationRequired(error: unknown) {
  return error instanceof UserAuthorizationRequiredError;
}
