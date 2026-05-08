jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    tasks: { count: jest.fn() },
  },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { getTasksCount } from "../get-tasks-count";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const tc = prismadb.tasks.count as jest.MockedFunction<typeof prismadb.tasks.count>;

beforeEach(() => jest.clearAllMocks());

describe("getTasksCount", () => {
  it("returns 0 when unauthenticated", async () => {
    gs.mockResolvedValue(null as any);
    await expect(getTasksCount()).resolves.toBe(0);
    expect(tc).not.toHaveBeenCalled();
  });

  it("user role returns scoped count (where: { user: id })", async () => {
    gs.mockResolvedValue({ user: { id: "u1" } } as any);
    fu.mockResolvedValue({ id: "u1", role: "user" } as any);
    tc.mockResolvedValue(5 as any);
    await expect(getTasksCount()).resolves.toBe(5);
    expect(tc).toHaveBeenCalledWith({ where: { user: "u1" } });
  });

  it("admin gets global count (no where)", async () => {
    gs.mockResolvedValue({ user: { id: "a1" } } as any);
    fu.mockResolvedValue({ id: "a1", role: "admin" } as any);
    tc.mockResolvedValue(42 as any);
    await expect(getTasksCount()).resolves.toBe(42);
    expect(tc).toHaveBeenCalledWith();
  });
});
