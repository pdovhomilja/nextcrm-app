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
