import { AuthorizationError } from "../errors";

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Contacts: { findFirst: jest.fn() },
    crm_Targets: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  assertCanReadContact,
  assertCanWriteContact,
  assertCanReadTarget,
  assertCanWriteTarget,
} from "../scopes/crm";

const findContact = prismadb.crm_Contacts.findFirst as jest.MockedFunction<
  typeof prismadb.crm_Contacts.findFirst
>;
const findTarget = prismadb.crm_Targets.findFirst as jest.MockedFunction<
  typeof prismadb.crm_Targets.findFirst
>;

beforeEach(() => jest.clearAllMocks());

describe("assertCanReadContact", () => {
  it("admin: bare where, resolves on hit", async () => {
    findContact.mockResolvedValue({ id: "c1" } as any);
    await expect(
      assertCanReadContact({ id: "u", role: "admin" }, "c1"),
    ).resolves.toBeUndefined();
    expect(findContact).toHaveBeenCalledWith({
      where: { id: "c1" },
      select: { id: true },
    });
  });

  it("manager: bare where, resolves on hit", async () => {
    findContact.mockResolvedValue({ id: "c1" } as any);
    await assertCanReadContact({ id: "u", role: "manager" }, "c1");
    expect(findContact).toHaveBeenCalledWith({
      where: { id: "c1" },
      select: { id: true },
    });
  });

  it("user: scoped where with ownership OR clauses", async () => {
    findContact.mockResolvedValue({ id: "c1" } as any);
    await assertCanReadContact({ id: "u3", role: "user" }, "c1");
    const arg = findContact.mock.calls[0][0]!;
    expect(arg.where).toMatchObject({
      id: "c1",
      OR: expect.arrayContaining([
        { assigned_to: "u3" },
        { created_by: "u3" },
        { createdBy: "u3" },
      ]),
    });
  });

  it("throws AuthorizationError when no row", async () => {
    findContact.mockResolvedValue(null);
    await expect(
      assertCanReadContact({ id: "u3", role: "user" }, "c1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanWriteContact", () => {
  it("user: same scope as read for now (Phase D may diverge)", async () => {
    findContact.mockResolvedValue({ id: "c1" } as any);
    await assertCanWriteContact({ id: "u3", role: "user" }, "c1");
    const arg = findContact.mock.calls[0][0]!;
    expect(arg.where).toMatchObject({
      id: "c1",
      OR: expect.arrayContaining([
        { assigned_to: "u3" },
        { created_by: "u3" },
        { createdBy: "u3" },
      ]),
    });
  });

  it("throws AuthorizationError when no row", async () => {
    findContact.mockResolvedValue(null);
    await expect(
      assertCanWriteContact({ id: "u3", role: "user" }, "c1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanReadTarget", () => {
  it("admin: bare where", async () => {
    findTarget.mockResolvedValue({ id: "t1" } as any);
    await assertCanReadTarget({ id: "u", role: "admin" }, "t1");
    expect(findTarget).toHaveBeenCalledWith({
      where: { id: "t1" },
      select: { id: true },
    });
  });

  it("user: scoped to created_by", async () => {
    findTarget.mockResolvedValue({ id: "t1" } as any);
    await assertCanReadTarget({ id: "u3", role: "user" }, "t1");
    expect(findTarget).toHaveBeenCalledWith({
      where: { id: "t1", created_by: "u3" },
      select: { id: true },
    });
  });

  it("throws AuthorizationError on miss", async () => {
    findTarget.mockResolvedValue(null);
    await expect(
      assertCanReadTarget({ id: "u3", role: "user" }, "t1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanWriteTarget", () => {
  it("user: scoped to created_by", async () => {
    findTarget.mockResolvedValue({ id: "t1" } as any);
    await assertCanWriteTarget({ id: "u3", role: "user" }, "t1");
    expect(findTarget).toHaveBeenCalledWith({
      where: { id: "t1", created_by: "u3" },
      select: { id: true },
    });
  });

  it("throws on miss", async () => {
    findTarget.mockResolvedValue(null);
    await expect(
      assertCanWriteTarget({ id: "u3", role: "user" }, "t1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
