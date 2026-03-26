const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'aol.com', 'protonmail.com', 'me.com',
]);

export interface AgentOutput {
  target: Record<string, string | null>;
  contacts: Array<{
    name: string | null;
    email: string | null;
    title: string | null;
    linkedinUrl: string | null;
    phone: string | null;
    source: string;
  }>;
  confidence: Record<string, number>;
}

export interface DomainContext {
  companyWebsite: string | null;
  email: string | null;
  companyName: string;
}

/** Returns the known company domain, or null if it must be searched. */
export function resolveCompanyDomain(ctx: DomainContext): string | null {
  if (ctx.companyWebsite) {
    try {
      return new URL(ctx.companyWebsite).hostname.replace(/^www\./, '');
    } catch { /* ignore */ }
  }
  if (ctx.email) {
    const domain = ctx.email.split('@')[1];
    if (domain && !PERSONAL_EMAIL_DOMAINS.has(domain.toLowerCase())) {
      return domain;
    }
  }
  return null;
}

/** Removes fields from the result whose confidence is below threshold. */
export function filterByConfidence(
  fields: Record<string, string | null>,
  confidence: Record<string, number>,
  threshold = 0.6
): Record<string, string | null> {
  return Object.fromEntries(
    Object.entries(fields).filter(([key]) => {
      const score = confidence[key];
      return score === undefined || score >= threshold;
    })
  );
}

/** Builds the Prisma where clause for contact upsert dedup. */
export function buildContactUpsertKey(
  targetId: string,
  contact: { email: string | null; linkedinUrl: string | null }
): Record<string, unknown> {
  if (contact.email) {
    return { targetId_email: { targetId, email: contact.email } };
  }
  if (contact.linkedinUrl) {
    return { targetId_linkedinUrl: { targetId, linkedinUrl: contact.linkedinUrl } };
  }
  throw new Error("buildContactUpsertKey: contact has neither email nor linkedinUrl");
}
