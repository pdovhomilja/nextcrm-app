export type MergeTagTarget = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  company?: string | null;
  position?: string | null;
  homepage_url?: string | null;
  homepage_screenshot?: string | null;
};

const MERGE_TAG_MAP: Record<string, keyof MergeTagTarget> = {
  first_name: "first_name",
  last_name: "last_name",
  email: "email",
  company: "company",
  position: "position",
  homepage_url: "homepage_url",
  homepage_screenshot: "homepage_screenshot",
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
