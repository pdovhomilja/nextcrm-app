jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: {
      findUnique: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { getUsersByRole } from "../users";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;

beforeEach(() => jest.clearAllMocks());

describe("users-report gating", () => {
  it("user role is rejected", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    await expect(
      getUsersByRole({ dateFrom: new Date(), dateTo: new Date() }),
    ).rejects.toThrow(/forbidden/i);
  });

  it("manager allowed", async () => {
    gs.mockResolvedValue({ user: { id: "m" } } as any);
    fu.mockResolvedValue({ id: "m", role: "manager" } as any);
    (prismadb.users.groupBy as jest.Mock).mockResolvedValue([]);
    await expect(
      getUsersByRole({ dateFrom: new Date(), dateTo: new Date() }),
    ).resolves.toBeDefined();
  });
});
