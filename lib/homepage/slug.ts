import { prismadb } from "@/lib/prisma";
import { slugify, isValidSlug, SLUG_MAX_LENGTH, SLUG_SUFFIX_ROOM } from "@/lib/homepage/slug-shape";

// Shape helpers live in the prisma-free lib/homepage/slug-shape.ts so client
// components can share them; re-exported here so existing server imports of
// "@/lib/homepage/slug" keep working unchanged.
export { slugify, isValidSlug, SLUG_MAX_LENGTH, SLUG_SUFFIX_ROOM };

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
      select: { id: true },
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
