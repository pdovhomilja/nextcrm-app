// Prompt-kind helpers (not a "use server" file, so it may export values).
export type AiPromptKind =
  | "EMAIL"
  | "HOMEPAGE"
  | "HOMEPAGE_BASE"
  | "HOMEPAGE_INDUSTRY"
  | "HOMEPAGE_STYLE"
  | "HOMEPAGE_AVOID";

// Org-level homepage-generation configuration: only admins may create, edit or
// delete these, regardless of scope. EMAIL / HOMEPAGE stay personal-editable.
const ADMIN_ONLY_KINDS: ReadonlySet<AiPromptKind> = new Set<AiPromptKind>([
  "HOMEPAGE_BASE",
  "HOMEPAGE_INDUSTRY",
  "HOMEPAGE_STYLE",
  "HOMEPAGE_AVOID",
]);

export const isAdminOnlyKind = (kind: AiPromptKind): boolean => ADMIN_ONLY_KINDS.has(kind);
