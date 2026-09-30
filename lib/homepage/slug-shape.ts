// Prisma-free slug shape helpers. Kept separate from lib/homepage/slug.ts (which
// imports prisma for uniqueness checks) so BOTH the server AND client components
// can import the exact same slugify/validator — a Client Component can't bundle
// anything that pulls in prisma. slug.ts re-exports these.

/** slugify() truncates to this many characters. */
export const SLUG_MAX_LENGTH = 150;
// ensureUniqueSlug() may append "-<n>" after truncation; leave room for it.
export const SLUG_SUFFIX_ROOM = 10;
const SLUG_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Canonical slug validator: exactly the shape slugify()/ensureUniqueSlug() can emit
 * (lowercase alnum, single interior hyphens, no leading/trailing hyphen). Used by the
 * public serving guard so it can never drift from what slugify produces.
 */
export function isValidSlug(s: string): boolean {
  return (
    typeof s === "string" &&
    s.length > 0 &&
    s.length <= SLUG_MAX_LENGTH + SLUG_SUFFIX_ROOM &&
    SLUG_SHAPE.test(s)
  );
}

/**
 * Converts a string to a URL-friendly slug.
 * - Converts to lowercase
 * - Replaces non-alphanumeric characters with hyphens
 * - Collapses multiple hyphens to single hyphen
 * - Trims hyphens from start and end
 * - Caps length at 150 characters
 */
export function slugify(input: string): string {
  if (!input || !input.trim()) {
    return "";
  }

  return (
    input
      .toLowerCase()
      // Replace any non-alphanumeric characters with hyphens
      .replace(/[^a-z0-9-]/g, "-")
      // Collapse multiple consecutive hyphens into single hyphen
      .replace(/-+/g, "-")
      // Trim hyphens from start and end
      .replace(/^-+|-+$/g, "")
      // Cap at SLUG_MAX_LENGTH characters
      .slice(0, SLUG_MAX_LENGTH)
      // Truncation can leave a trailing hyphen
      .replace(/-+$/g, "")
  );
}
