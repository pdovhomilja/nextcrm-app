/** Company mailbox domain (e.g. vensailabs.in). */
export function getOrgEmailDomain(): string {
  const explicit = process.env.ORG_EMAIL_DOMAIN?.trim().toLowerCase();
  if (explicit) return explicit.replace(/^@/, "");

  const from = process.env.RESEND_FROM_EMAIL?.trim().toLowerCase();
  if (from?.includes("@")) {
    return from.split("@")[1] ?? "vensailabs.in";
  }

  return "vensailabs.in";
}

export function slugifyUsername(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 48);
}

export function defaultWorkEmailForUsername(username: string): string {
  const slug = slugifyUsername(username);
  if (!slug) throw new Error("Username is required");
  return `${slug}@${getOrgEmailDomain()}`;
}

export function isValidWorkEmail(email: string, domain = getOrgEmailDomain()): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(`@${domain}`) && normalized.length > domain.length + 1;
}
