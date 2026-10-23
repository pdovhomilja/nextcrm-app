import { decrypt, encrypt } from "@/lib/email-crypto";
import { prismadb } from "@/lib/prisma";
import { CANVA_API, CANVA_TOKEN_URL, canvaBasicAuth } from "@/lib/canva/config";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};

export async function exchangeCanvaCode(input: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    code_verifier: input.codeVerifier,
    redirect_uri: input.redirectUri,
  });
  const res = await fetch(CANVA_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${canvaBasicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as TokenResponse & { error?: string; message?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.message || json.error || `Canva token exchange failed (${res.status})`);
  }
  return json;
}

async function refreshCanvaToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(CANVA_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${canvaBasicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as TokenResponse & { message?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.message || "Canva token refresh failed");
  }
  return json;
}

export async function persistCanvaTokens(
  userId: string,
  tokens: TokenResponse,
  profile?: { canvaUserId?: string; displayName?: string }
) {
  const tokenExpiresAt = new Date(Date.now() + Math.max(60, tokens.expires_in) * 1000);
  await prismadb.canvaConnection.upsert({
    where: { userId },
    create: {
      userId,
      canvaUserId: profile?.canvaUserId,
      displayName: profile?.displayName,
      accessTokenEncrypted: encrypt(tokens.access_token),
      refreshTokenEncrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokenExpiresAt,
      scope: tokens.scope,
    },
    update: {
      canvaUserId: profile?.canvaUserId,
      displayName: profile?.displayName,
      accessTokenEncrypted: encrypt(tokens.access_token),
      refreshTokenEncrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
      tokenExpiresAt,
      scope: tokens.scope,
    },
  });
}

export async function getCanvaAccessToken(userId: string): Promise<string> {
  const row = await prismadb.canvaConnection.findUnique({ where: { userId } });
  if (!row) throw new Error("Canva is not connected");

  const expiresSoon = !row.tokenExpiresAt || row.tokenExpiresAt.getTime() < Date.now() + 60_000;
  if (!expiresSoon) return decrypt(row.accessTokenEncrypted);

  if (!row.refreshTokenEncrypted) throw new Error("Canva session expired. Connect again.");
  const refreshed = await refreshCanvaToken(decrypt(row.refreshTokenEncrypted));
  await persistCanvaTokens(userId, refreshed);
  return refreshed.access_token;
}

export async function canvaFetch(userId: string, path: string, init?: RequestInit) {
  const token = await getCanvaAccessToken(userId);
  const res = await fetch(`${CANVA_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (json as { message?: string; error?: { message?: string } }).message ||
      (json as { error?: { message?: string } }).error?.message ||
      `Canva API ${res.status}`;
    throw new Error(message);
  }
  return json;
}
