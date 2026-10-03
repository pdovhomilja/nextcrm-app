// Shared "has a generated homepage" option list + presence derivation and the
// click-through URL, reused by the targets table column and its faceted filter.
// A page counts as present once it has a published version (current_version_id),
// matching the /p/ serving gate and the email drawer's hasHomepage — NOT the
// transient job status (a later RUNNING/FAILED refine still has a published page).

export const HOMEPAGE_PRESENCE_OPTIONS = [
  { label: "Has homepage", value: "YES" },
  { label: "No homepage", value: "NONE" },
] as const;

export type HomepagePresence =
  (typeof HOMEPAGE_PRESENCE_OPTIONS)[number]["value"];

// Minimal shape the derivation reads from a target's one-to-one homepage row.
export type TargetHomepageLike = {
  slug?: string | null;
  status?: string | null;
  preview_url?: string | null;
  current_version_id?: string | null;
  deletedAt?: Date | string | null;
} | null | undefined;

/** "YES" when a published (non-deleted) homepage exists, else "NONE". */
export function targetHomepagePresence(
  homepage: TargetHomepageLike,
): HomepagePresence {
  if (!homepage || homepage.deletedAt) return "NONE";
  return homepage.current_version_id ? "YES" : "NONE";
}

/**
 * The safe http(s) preview URL to open when the cell is clicked, or null when
 * there is no published page or the stored URL is unsafe/absent. Guards against
 * linkifying a non-http(s) value (click-to-XSS for admins viewing others' rows).
 */
export function targetHomepageUrl(homepage: TargetHomepageLike): string | null {
  if (!homepage || homepage.deletedAt || !homepage.current_version_id) {
    return null;
  }
  const url = homepage.preview_url?.trim();
  return url && /^https?:\/\//i.test(url) ? url : null;
}

export function homepagePresenceLabel(value?: string | null): string {
  return (
    HOMEPAGE_PRESENCE_OPTIONS.find((o) => o.value === value)?.label ??
    "No homepage"
  );
}
