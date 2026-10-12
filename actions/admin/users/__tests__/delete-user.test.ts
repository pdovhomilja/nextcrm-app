jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn(), delete: jest.fn().mockResolvedValue({ id: "x" }) },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { deleteUser } from "../delete-user";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const del = prismadb.users.delete as jest.MockedFunction<typeof prismadb.users.delete>;

beforeEach(() => {
  jest.clearAllMocks();
  gs.mockResolvedValue({ user: { id: "a" } } as any);
  fu.mockResolvedValue({ id: "a", role: "admin" } as any);
});

describe("deleteUser", () => {
  it("refuses to delete the acting admin", async () => {
    const res = await deleteUser("a");
    expect(res).toEqual({ error: "Cannot delete yourself" });
    expect(del).not.toHaveBeenCalled();
  });

  it("deletes another user", async () => {
    const res = await deleteUser("target");
    expect(res).toMatchObject({ data: expect.anything() });
    expect(del).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "target" } }));
  });
});
