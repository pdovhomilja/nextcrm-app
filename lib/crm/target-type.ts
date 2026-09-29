// Fork-owned single source of truth for the Individual/Company target
// taxonomy. Consumed by forms, detail view, list, MCP tools, and CSV import.

export const TARGET_TYPES = ["INDIVIDUAL", "COMPANY"] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

export const TARGET_TYPE_OPTIONS = [
  { label: "Individual", value: "INDIVIDUAL" },
  { label: "Company", value: "COMPANY" },
] as const;

export function targetTypeLabel(value?: string | null): string {
  return TARGET_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? "Company";
}

// Badge variant: COMPANY neutral, INDIVIDUAL highlighted.
export function targetTypeBadgeVariant(
  value?: string | null
): "default" | "secondary" {
  return value === "INDIVIDUAL" ? "default" : "secondary";
}

export function normalizeTargetType(value?: string | null): TargetType {
  return value === "INDIVIDUAL" ? "INDIVIDUAL" : "COMPANY";
}

export interface TargetIdentityFields {
  type?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
}

export function resolveTargetTitle(t: TargetIdentityFields): string {
  if (normalizeTargetType(t.type) === "INDIVIDUAL") {
    const name = `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim();
    return name || "(unnamed individual)";
  }
  return (t.company ?? "").trim() || "(unnamed company)";
}

export function requiredIdentityField(type: TargetType): "company" | "last_name" {
  return type === "COMPANY" ? "company" : "last_name";
}

export function hasRequiredIdentity(t: TargetIdentityFields): boolean {
  if (normalizeTargetType(t.type) === "COMPANY") return Boolean((t.company ?? "").trim());
  return Boolean((t.last_name ?? "").trim());
}

// Ordered field keys to display per type. Shared fields (location, socials,
// description) appear in both groups. `company` appears in both with a
// type-specific label (see fieldLabel).
const TARGET_FIELD_GROUPS: Record<TargetType, string[]> = {
  INDIVIDUAL: [
    "first_name", "last_name", "position", "company",
    "email", "personal_email", "mobile_phone", "office_phone", "personal_website",
    "city", "country",
    "social_linkedin", "social_x", "social_instagram", "social_facebook",
    "description",
  ],
  COMPANY: [
    "company", "industry", "employees",
    "company_website", "company_email", "company_phone",
    "city", "country",
    "social_linkedin", "social_x", "social_instagram", "social_facebook",
    "description",
  ],
};

export function fieldsForType(type: TargetType): string[] {
  return TARGET_FIELD_GROUPS[type];
}

export function isFieldForType(type: TargetType, key: string): boolean {
  return TARGET_FIELD_GROUPS[type].includes(key);
}

const FIELD_LABELS: Record<string, string> = {
  first_name: "First name", last_name: "Last name", position: "Position",
  email: "Email", personal_email: "Personal email", mobile_phone: "Mobile phone",
  office_phone: "Office phone", personal_website: "Personal website",
  company_website: "Company website", company_email: "Company email",
  company_phone: "Company phone", industry: "Industry", employees: "Employees",
  city: "City", country: "Country", description: "Description",
  social_linkedin: "LinkedIn", social_x: "X (Twitter)",
  social_instagram: "Instagram", social_facebook: "Facebook",
};

export function fieldLabel(type: TargetType, key: string): string {
  if (key === "company") return type === "INDIVIDUAL" ? "Employer" : "Company name";
  return FIELD_LABELS[key] ?? key;
}
