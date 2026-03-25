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

export function resolveMergeTags(html: string, target: MergeTagTarget): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, tag: string) => {
    const field = MERGE_TAG_MAP[tag];
    if (!field) return match; // unknown tag — leave as-is
    return target[field] ?? "";
  });
}
