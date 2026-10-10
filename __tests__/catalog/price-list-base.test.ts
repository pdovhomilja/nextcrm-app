const db: Record<string, any> = { crm_PriceLists: { findMany: jest.fn() } };
jest.mock("@/lib/prisma", () => ({ prismadb: db }));
jest.mock("@/lib/authz", () => ({ requireAuthenticated: jest.fn().mockResolvedValue({ id: "u", role: "user" }) }));
import { getPriceLists } from "@/actions/crm/price-lists/queries";

it("marks lists used as a base", async () => {
  db.crm_PriceLists.findMany.mockResolvedValue([{ id: "B", name: "Base", currency: "CZK", isActive: false, source: "EXTERNAL", updatedAt: new Date(), _count: { rules: 3, baseFor: 5 } }]);
  expect((await getPriceLists({ includeArchived: true }))[0]).toMatchObject({ usedAsBase: true });
  expect(db.crm_PriceLists.findMany.mock.calls[0][0].include).toEqual({ _count: { select: { rules: true, baseFor: true } } });
});
