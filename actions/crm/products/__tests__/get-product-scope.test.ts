jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Products: { findUnique: jest.fn() },
  },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { getProduct } from "../get-product";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const findProd = prismadb.crm_Products.findUnique as jest.MockedFunction<typeof prismadb.crm_Products.findUnique>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getProduct auth gate", () => {
  it("returns null when unauthenticated", async () => {
    gs.mockResolvedValue(null as any);
    const res = await getProduct("p1");
    expect(res).toBeNull();
    expect(findProd).not.toHaveBeenCalled();
  });

  it("returns row when authenticated", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    findProd.mockResolvedValue({ id: "p1", name: "Widget" } as any);
    const res = await getProduct("p1");
    expect(res).toMatchObject({ id: "p1" });
    expect(findProd).toHaveBeenCalled();
  });
});
