export type CategoryNode = { id: string; name: string; parentId: string | null };

/** Categories that may become the parent of `id`: not itself and not one of its descendants. */
export function categoryOptionsFor<T extends CategoryNode>(id: string | null, categories: T[]): T[] {
  if (!id) return categories;
  const blocked = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) if (c.parentId && blocked.has(c.parentId) && !blocked.has(c.id)) { blocked.add(c.id); grew = true; }
  }
  return categories.filter((c) => !blocked.has(c.id));
}
