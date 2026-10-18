jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { setUserRole } from "../set-role";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<
  typeof prismadb.users.findUnique
>;
const upd = prismadb.users.update as jest.MockedFunction<
  typeof prismadb.users.update
>;

beforeEach(() => jest.clearAllMocks());

describe("setUserRole", () => {
  it("returns Unauthorized when no session", async () => {
    gs.mockResolvedValue(null as any);
    const res = await setUserRole("target", "manager");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(upd).not.toHaveBeenCalled();
  });

  it("returns Forbidden when not admin", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "manager" } as any);
    const res = await setUserRole("target", "user");
    expect(res).toEqual({ error: "Forbidden" });
    expect(upd).not.toHaveBeenCalled();
  });

  it("admin updates role only — does NOT write is_admin", async () => {
    gs.mockResolvedValue({ user: { id: "a" } } as any);
    fu.mockResolvedValue({ id: "a", role: "admin" } as any);
    upd.mockResolvedValue({ id: "target", role: "manager" } as any);

    const res = await setUserRole("target", "manager");
    expect(res).toEqual({ data: expect.objectContaining({ id: "target" }) });

    expect(upd).toHaveBeenCalledTimes(1);
    const callArgs = upd.mock.calls[0]![0]!;
    expect(callArgs.data).toEqual({ role: "manager" });
    expect(callArgs.data).not.toHaveProperty("is_admin");
  });

  it("admin can make a user a partner", async () => {
    gs.mockResolvedValue({ user: { id: "a" } } as any);
    fu.mockResolvedValue({ id: "a", role: "admin" } as any);
    upd.mockResolvedValue({ id: "target", role: "partner" } as any);

    const res = await setUserRole("target", "partner");
    expect(res).toEqual({ data: expect.objectContaining({ role: "partner" }) });
    expect(upd.mock.calls[0]![0]!.data).toEqual({ role: "partner" });
  });

  it("rejects a role that does not exist", async () => {
    gs.mockResolvedValue({ user: { id: "a" } } as any);
    fu.mockResolvedValue({ id: "a", role: "admin" } as any);
    const res = await setUserRole("target", "owner" as any);
    expect(res).toEqual({ error: "Invalid role" });
    expect(upd).not.toHaveBeenCalled();
  });

  it("blocks self-demotion from admin", async () => {
    gs.mockResolvedValue({ user: { id: "a" } } as any);
    fu.mockResolvedValue({ id: "a", role: "admin" } as any);
    const res = await setUserRole("a", "manager");
    expect(res).toEqual({ error: "Cannot remove your own admin role" });
    expect(upd).not.toHaveBeenCalled();
  });
});
