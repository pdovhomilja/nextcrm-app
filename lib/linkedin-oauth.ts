import "server-only";

import { prismadb } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/email-crypto";
import { LINKEDIN_SCOPES } from "@/lib/linkedin-scopes";

export function hasDirectLinkedInOAuth(): boolean {
  const id = process.env.LINKEDIN_CLIENT_ID?.trim();
  const secret = process.env.LINKEDIN_CLIENT_SECRET?.trim();
  return Boolean(id && secret);
}

export function getLinkedInOAuthCredentials() {
  const clientId = process.env.LINKEDIN_CLIENT_ID?.trim();
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET are required");
  }
  return { clientId, clientSecret };
}

export function getLinkedInRedirectUri(appOrigin: string): string {
  return `${appOrigin.replace(/\/$/, "")}/api/linkedin/callback`;
}

export function buildLinkedInAuthorizeUrl(appOrigin: string, state: string): string {
  const { clientId } = getLinkedInOAuthCredentials();
  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getLinkedInRedirectUri(appOrigin));
  url.searchParams.set("state", state);
  url.searchParams.set("scope", LINKEDIN_SCOPES.join(" "));
  return url.toString();
}

type LinkedInTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

async function exchangeLinkedInToken(body: URLSearchParams): Promise<LinkedInTokenResponse> {
  const { clientId, clientSecret } = getLinkedInOAuthCredentials();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    error_description?: string;
  } & LinkedInTokenResponse;

  if (!response.ok) {
    const detail = payload.error_description ?? payload.error ?? response.statusText;
    throw new Error(`LinkedIn token exchange failed: ${detail}`);
  }

  if (!payload.access_token) {
    throw new Error("LinkedIn token exchange returned no access_token");
  }

  return payload;
}

export async function exchangeLinkedInAuthorizationCode(code: string, appOrigin: string) {
  return exchangeLinkedInToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getLinkedInRedirectUri(appOrigin),
    })
  );
}

async function refreshLinkedInAccessToken(refreshToken: string): Promise<LinkedInTokenResponse> {
  return exchangeLinkedInToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    })
  );
}

function tokenExpiresAt(expiresIn?: number): Date | null {
  if (!expiresIn) return null;
  return new Date(Date.now() + expiresIn * 1000);
}

export async function persistLinkedInTokens(userId: string, tokens: LinkedInTokenResponse) {
  const existing = await prismadb.linkedInConnection.findUnique({ where: { userId } });
  const refreshTokenEncrypted =
    tokens.refresh_token != null
      ? encrypt(tokens.refresh_token)
      : existing?.refreshTokenEncrypted ?? null;

  await prismadb.linkedInConnection.upsert({
    where: { userId },
    create: {
      userId,
      accessTokenEncrypted: encrypt(tokens.access_token),
      refreshTokenEncrypted,
      tokenExpiresAt: tokenExpiresAt(tokens.expires_in),
      scope: tokens.scope ?? LINKEDIN_SCOPES.join(" "),
    },
    update: {
      accessTokenEncrypted: encrypt(tokens.access_token),
      ...(tokens.refresh_token != null
        ? { refreshTokenEncrypted: encrypt(tokens.refresh_token) }
        : {}),
      tokenExpiresAt: tokenExpiresAt(tokens.expires_in),
      scope: tokens.scope ?? undefined,
    },
  });
}

export async function getDirectLinkedInAccessToken(userId: string): Promise<string> {
  const row = await prismadb.linkedInConnection.findUnique({ where: { userId } });
  if (!row) {
    throw new Error("LinkedIn is not connected for this user");
  }

  const expiresAt = row.tokenExpiresAt?.getTime() ?? 0;
  const needsRefresh = expiresAt > 0 && expiresAt < Date.now() + 60_000;

  if (!needsRefresh) {
    return decrypt(row.accessTokenEncrypted);
  }

  if (!row.refreshTokenEncrypted) {
    return decrypt(row.accessTokenEncrypted);
  }

  const refreshed = await refreshLinkedInAccessToken(decrypt(row.refreshTokenEncrypted));
  await persistLinkedInTokens(userId, refreshed);
  return refreshed.access_token;
}
