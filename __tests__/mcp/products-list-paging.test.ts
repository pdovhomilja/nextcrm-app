// crm_list_products pages with limit/offset. Products from a bulk import share
// one createdAt; Postgres returns rows tied on every sort key in any order, and
// that order can differ between pages. The fake findMany below does the same,
// so paging only works if the tool asks for a total order.

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Products: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prismadb } from "@/lib/prisma";
import { crmProductTools } from "@/lib/mcp/tools/crm-products";

const IMPORTED_AT = new Date("2026-10-30T12:00:00.000Z");
const products = Array.from({ length: 250 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  name: `Product ${i}`,
  createdAt: IMPORTED_AT,
  deletedAt: null,
}));

// Same input, different page -> different order of tied rows.
function tieBreak(id: string, skip: number): number {
  let h = skip + 1;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 2654435761);
  return h >>> 0;
}

function fakeFindMany(args: { orderBy: any; take: number; skip: number }) {
  const keys: Record<string, "asc" | "desc">[] = Array.isArray(args.orderBy)
    ? args.orderBy
    : [args.orderBy];
  const sorted = [...products].sort((a: any, b: any) => {
    for (const key of keys) {
      const [field, dir] = Object.entries(key)[0];
      if (a[field] < b[field]) return dir === "asc" ? -1 : 1;
      if (a[field] > b[field]) return dir === "asc" ? 1 : -1;
    }
    return tieBreak(a.id, args.skip) - tieBreak(b.id, args.skip);
  });
  return Promise.resolve(sorted.slice(args.skip, args.skip + args.take));
}

const list = crmProductTools.find((t) => t.name === "crm_list_products")!;

it("paging over products with the same createdAt returns each product exactly once", async () => {
  (prismadb.crm_Products.findMany as jest.Mock).mockImplementation(fakeFindMany);
  (prismadb.crm_Products.count as jest.Mock).mockResolvedValue(products.length);

  const seen: string[] = [];
  for (let offset = 0; offset < products.length; offset += 100) {
    const res: any = await (list.handler as any)({ limit: 100, offset }, "u1");
    seen.push(...res.data.map((p: { id: string }) => p.id));
  }

  expect(seen).toHaveLength(250);
  expect(new Set(seen).size).toBe(250);
});
