import "server-only";

/** Normalize LinkedIn Lead Sync / manual webhook payloads into CRM lead fields. */
export function parseLinkedInLeadPayload(body: unknown): {
  firstName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  externalId?: string;
} | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;

  const nested =
    record.leadFormResponse && typeof record.leadFormResponse === "object"
      ? (record.leadFormResponse as Record<string, unknown>)
      : record;

  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = nested[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return undefined;
  };

  const lastName =
    pick("lastName", "last_name", "lastname") ??
    pick("fullName", "full_name")?.split(/\s+/).slice(-1)[0];

  if (!lastName) return null;

  const fullName = pick("fullName", "full_name");
  const firstName =
    pick("firstName", "first_name", "firstname") ??
    (fullName ? fullName.split(/\s+/).slice(0, -1).join(" ") || undefined : undefined);

  return {
    firstName,
    lastName,
    email: pick("email", "emailAddress", "work_email"),
    phone: pick("phone", "phoneNumber", "mobile"),
    company: pick("company", "companyName", "organization", "account"),
    jobTitle: pick("jobTitle", "title", "job"),
    externalId: pick("id", "leadId", "linkedinLeadId", "submissionId"),
  };
}
