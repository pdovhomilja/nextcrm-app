jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({ id: "x" }) },
    session: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
    apiToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/sendmail", () => ({ __esModule: true, default: jest.fn() }));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { activateUser } from "../activate-user";
import { deactivateUser } from "../deactivate-user";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const upd = prismadb.users.update as jest.MockedFunction<typeof prismadb.users.update>;

beforeEach(() => jest.clearAllMocks());

describe.each([
  ["activateUser", activateUser],
  ["deactivateUser", deactivateUser],
])("%s admin gate", (_, fn) => {
  it("Unauthorized when no session", async () => {
    gs.mockResolvedValue(null as any);
    const res = await fn("u1");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(upd).not.toHaveBeenCalled();
  });

  it("Forbidden when not admin", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    const res = await fn("target");
    expect(res).toEqual({ error: "Forbidden" });
    expect(upd).not.toHaveBeenCalled();
  });

  it("admin succeeds", async () => {
    gs.mockResolvedValue({ user: { id: "a" } } as any);
    fu.mockResolvedValue({ id: "a", role: "admin" } as any);
    upd.mockResolvedValue({ id: "target" } as any);
    const res = await fn("target");
    expect(res).toMatchObject({ data: expect.anything() });
    expect(upd).toHaveBeenCalled();
  });
});

describe("deactivateUser ends access", () => {
  it("deletes the user's sessions and revokes their active API tokens", async () => {
    gs.mockResolvedValue({ user: { id: "a" } } as any);
    fu.mockResolvedValue({ id: "a", role: "admin" } as any);
    upd.mockResolvedValue({ id: "target" } as any);

    await deactivateUser("target");

    expect(upd).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "target" }, data: { userStatus: "INACTIVE" } })
    );
    expect(prismadb.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "target" } });
    expect(prismadb.apiToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "target", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("touches no sessions or tokens when the caller is not an admin", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "manager" } as any);

    await deactivateUser("target");

    expect(prismadb.session.deleteMany).not.toHaveBeenCalled();
    expect(prismadb.apiToken.updateMany).not.toHaveBeenCalled();
  });
});
