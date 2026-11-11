// crm_list_products pages with limit/offset. Products from a bulk import share
// one createdAt; Postgres returns rows tied on every sort key in any order, and
// that order can differ between pages. The fake findMany (tied-rows-find-many)
// does the same, so paging only works if the tool asks for a total order.

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
import { tiedRowsFindMany } from "./tied-rows-find-many";

const IMPORTED_AT = new Date("2026-10-30T12:00:00.000Z");
const products = Array.from({ length: 250 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  name: `Product ${i}`,
  createdAt: IMPORTED_AT,
  deletedAt: null,
}));

const list = crmProductTools.find((t) => t.name === "crm_list_products")!;

it("paging over products with the same createdAt returns each product exactly once", async () => {
  (prismadb.crm_Products.findMany as jest.Mock).mockImplementation(tiedRowsFindMany(products));
  (prismadb.crm_Products.count as jest.Mock).mockResolvedValue(products.length);

  const seen: string[] = [];
  for (let offset = 0; offset < products.length; offset += 100) {
    const res: any = await (list.handler as any)({ limit: 100, offset }, "u1");
    seen.push(...res.data.map((p: { id: string }) => p.id));
  }

  expect(seen).toHaveLength(250);
  expect(new Set(seen).size).toBe(250);
});
