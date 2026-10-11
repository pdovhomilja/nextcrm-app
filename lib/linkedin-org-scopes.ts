export function linkedInOrgScopesEnabled(): boolean {
  return process.env.LINKEDIN_ORG_SCOPES === "true";
}
