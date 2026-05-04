jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Products: { findMany: jest.fn() },
  },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { getProductsFull } from "../get-products";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const findMany = prismadb.crm_Products.findMany as jest.MockedFunction<typeof prismadb.crm_Products.findMany>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getProductsFull auth gate", () => {
  it("returns [] when unauthenticated", async () => {
    gs.mockResolvedValue(null as any);
    const res = await getProductsFull();
    expect(res).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("returns array when authenticated", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    findMany.mockResolvedValue([{ id: "p1", name: "Widget" }] as any);
    const res = await getProductsFull();
    expect(res).toHaveLength(1);
    expect(findMany).toHaveBeenCalled();
  });
});
