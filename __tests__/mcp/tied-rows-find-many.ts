// Fake prisma findMany for offset-paging tests. Postgres returns rows tied on
// every sort key in any order, and that order can differ between pages. This
// fake sorts by the given orderBy and shuffles full ties differently per
// `skip`, so paging only works if the caller asks for a total order.

// Same input, different page -> different order of tied rows.
function tieBreak(id: string, skip: number): number {
  let h = skip + 1;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 2654435761);
  return h >>> 0;
}

export function tiedRowsFindMany<T extends { id: string }>(rows: T[]) {
  return (args: { orderBy: any; take: number; skip: number }) => {
    const keys: Record<string, "asc" | "desc">[] = Array.isArray(args.orderBy)
      ? args.orderBy
      : [args.orderBy];
    const sorted = [...rows].sort((a: any, b: any) => {
      for (const key of keys) {
        const [field, dir] = Object.entries(key)[0];
        if (a[field] < b[field]) return dir === "asc" ? -1 : 1;
        if (a[field] > b[field]) return dir === "asc" ? 1 : -1;
      }
      return tieBreak(a.id, args.skip) - tieBreak(b.id, args.skip);
    });
    return Promise.resolve(sorted.slice(args.skip, args.skip + args.take));
  };
}
