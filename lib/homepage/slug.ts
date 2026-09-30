import { prismadb } from "@/lib/prisma";

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
      // Cap at 150 characters
      .slice(0, 150)
  );
}

/**
 * Ensures a slug is unique by suffixing with -2, -3, etc. if necessary.
 * Checks the database for existing slugs and increments suffix until finding a free one.
 */
export async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);

  // If empty slug (shouldn't happen in normal use), return it
  if (!slug) {
    return slug;
  }

  let suffix = 1;
  let candidate = slug;

  while (true) {
    const existing = await prismadb.crm_Target_Homepage.findUnique({
      where: { slug: candidate },
    });

    if (!existing) {
      // Slug is free
      return candidate;
    }

    // Slug is taken, try next suffix
    suffix++;
    candidate = `${slug}-${suffix}`;
  }
}
