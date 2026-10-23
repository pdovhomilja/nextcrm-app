export const CANVA_SCOPES = [
  "profile:read",
  "design:meta:read",
  "design:content:read",
  "design:content:write",
  "brandtemplate:meta:read",
  "brandtemplate:content:read",
].join(" ");

export const CANVA_AUTHORIZE_URL = "https://www.canva.com/api/oauth/authorize";
export const CANVA_TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
export const CANVA_API = "https://api.canva.com/rest/v1";

export function canvaRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/canva/callback`;
}

export function hasCanvaOAuth(): boolean {
  return Boolean(process.env.CANVA_CLIENT_ID?.trim() && process.env.CANVA_CLIENT_SECRET?.trim());
}

export function canvaClientId(): string {
  const id = process.env.CANVA_CLIENT_ID?.trim();
  if (!id) throw new Error("CANVA_CLIENT_ID is not set");
  return id;
}

export function canvaBasicAuth(): string {
  const id = canvaClientId();
  const secret = process.env.CANVA_CLIENT_SECRET?.trim();
  if (!secret) throw new Error("CANVA_CLIENT_SECRET is not set");
  return Buffer.from(`${id}:${secret}`).toString("base64");
}
