import { AuthorizationError } from "../errors";

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { assertCanWriteAccount } from "../scopes/crm";

const find = prismadb.crm_Accounts.findFirst as jest.MockedFunction<
  typeof prismadb.crm_Accounts.findFirst
>;

beforeEach(() => jest.clearAllMocks());

describe("assertCanWriteAccount", () => {
  it("admin: bare where", async () => {
    find.mockResolvedValue({ id: "a1" } as any);
    await assertCanWriteAccount({ id: "u", role: "admin" }, "a1");
    expect(find).toHaveBeenCalledWith({
      where: { id: "a1" },
      select: { id: true },
    });
  });

  it("manager: bare where", async () => {
    find.mockResolvedValue({ id: "a1" } as any);
    await assertCanWriteAccount({ id: "u", role: "manager" }, "a1");
    expect(find).toHaveBeenCalledWith({
      where: { id: "a1" },
      select: { id: true },
    });
  });

  it("user: scoped with assigned/creator/watcher OR clauses", async () => {
    find.mockResolvedValue({ id: "a1" } as any);
    await assertCanWriteAccount({ id: "u3", role: "user" }, "a1");
    const arg = find.mock.calls[0][0]!;
    expect(arg.where).toMatchObject({
      id: "a1",
      OR: expect.arrayContaining([
        { assigned_to: "u3" },
        { createdBy: "u3" },
        { watchers: { some: { user_id: "u3" } } },
      ]),
    });
  });

  it("throws AuthorizationError when not in scope", async () => {
    find.mockResolvedValue(null);
    await expect(
      assertCanWriteAccount({ id: "u3", role: "user" }, "a1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
