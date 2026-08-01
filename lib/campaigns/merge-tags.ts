type MergeTagTarget = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  company?: string | null;
  position?: string | null;
};

const MERGE_TAG_MAP: Record<string, keyof MergeTagTarget> = {
  first_name: "first_name",
  last_name: "last_name",
  email: "email",
  company: "company",
  position: "position",
};

function escapeHtmlValue(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function resolveMergeTags(
  html: string,
  target: MergeTagTarget,
  escapeHtml = false
): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, tag: string) => {
    const field = MERGE_TAG_MAP[tag];
    if (!field) return match; // unknown tag — leave as-is
    const value = target[field] ?? "";
    return escapeHtml ? escapeHtmlValue(value) : value;
  });
}
