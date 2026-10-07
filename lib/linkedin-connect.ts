import "server-only";

import { getToken, startAuthorization, UserAuthorizationRequiredError } from "@vercel/connect";
import { headers } from "next/headers";
import {
  getDirectLinkedInAccessToken,
  hasDirectLinkedInOAuth,
} from "@/lib/linkedin-oauth";

export { LINKEDIN_SCOPES } from "@/lib/linkedin-scopes";

export const LINKEDIN_CONNECTOR_UID = "linkedin/vensai-crm-linkedin";

export async function getLinkedInAppOrigin() {
  if (process.env.NODE_ENV !== "production" && process.env.V0_RUNTIME_URL) {
    return process.env.V0_RUNTIME_URL;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  return `${requestHeaders.get("x-forwarded-proto") ?? "https"}://${host}`;
}

export async function getLinkedInSubject(userId: string) {
  return { type: "user" as const, id: userId };
}

export async function beginLinkedInAuthorization(userId: string) {
  const origin = await getLinkedInAppOrigin();
  const { LINKEDIN_SCOPES } = await import("@/lib/linkedin-scopes");
  return startAuthorization(
    LINKEDIN_CONNECTOR_UID,
    { subject: await getLinkedInSubject(userId), scopes: LINKEDIN_SCOPES },
    { callbackUrl: `${origin}/api/linkedin/callback` },
  );
}

export async function getLinkedInAccessToken(userId: string) {
  if (hasDirectLinkedInOAuth()) {
    return getDirectLinkedInAccessToken(userId);
  }
  const { LINKEDIN_SCOPES } = await import("@/lib/linkedin-scopes");
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
