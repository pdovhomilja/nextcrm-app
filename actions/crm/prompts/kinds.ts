// Prompt-kind helpers (not a "use server" file, so it may export values).
export type AiPromptKind =
  | "EMAIL"
  | "HOMEPAGE"
  | "HOMEPAGE_BASE"
  | "HOMEPAGE_INDUSTRY"
  | "HOMEPAGE_STYLE"
  | "HOMEPAGE_AVOID";

export type AiPromptScope = "ORG" | "USER";

// Org-level homepage-generation configuration: only admins may create, edit or
// delete these, regardless of scope. EMAIL / HOMEPAGE stay personal-editable.
const ADMIN_ONLY_KINDS: ReadonlySet<AiPromptKind> = new Set<AiPromptKind>([
  "HOMEPAGE_BASE",
  "HOMEPAGE_INDUSTRY",
  "HOMEPAGE_STYLE",
  "HOMEPAGE_AVOID",
]);

export const isAdminOnlyKind = (kind: AiPromptKind): boolean => ADMIN_ONLY_KINDS.has(kind);

// Human labels for the admin-managed homepage layer kinds, shared by the
// prompt-library list and create dialog. EMAIL / HOMEPAGE keep their raw
// display in the list (an e2e spec asserts on the literal "EMAIL").
export const HOMEPAGE_LAYER_KIND_LABELS: Partial<Record<AiPromptKind, string>> = {
  HOMEPAGE_BASE: "Homepage base (designer)",
  HOMEPAGE_INDUSTRY: "Industry",
  HOMEPAGE_STYLE: "Art direction",
  HOMEPAGE_AVOID: "Avoid list",
};
