jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
    crm_AccountProducts: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({
  writeAuditLog: jest.fn(),
  diffObjects: jest.fn().mockReturnValue([]),
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { updateAssignment } from "../update-assignment";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const accFind = prismadb.crm_Accounts.findFirst as jest.MockedFunction<typeof prismadb.crm_Accounts.findFirst>;
const apFindUnique = prismadb.crm_AccountProducts.findUnique as jest.MockedFunction<typeof prismadb.crm_AccountProducts.findUnique>;
const apUpdate = prismadb.crm_AccountProducts.update as jest.MockedFunction<typeof prismadb.crm_AccountProducts.update>;

const validInput = { id: "ap1", quantity: 5 };

beforeEach(() => {
  jest.clearAllMocks();
  apFindUnique.mockResolvedValue({ id: "ap1", accountId: "a1", start_date: new Date("2026-01-01") } as any);
  apUpdate.mockResolvedValue({ id: "ap1" } as any);
});

describe("updateAssignment account write scope", () => {
  it("Unauthorized when no session", async () => {
    gs.mockResolvedValue(null as any);
    const res = await updateAssignment(validInput);
    expect(res).toEqual({ error: "Unauthorized" });
    expect(apUpdate).not.toHaveBeenCalled();
  });

  it("Forbidden when user out of account scope", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    accFind.mockResolvedValue(null);
    const res = await updateAssignment(validInput);
    expect(res).toEqual({ error: "Forbidden" });
    expect(apUpdate).not.toHaveBeenCalled();
  });

  it("user in scope succeeds", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    accFind.mockResolvedValue({ id: "a1" } as any);
    const res = await updateAssignment(validInput);
    expect(res).toMatchObject({ data: { id: "ap1" } });
    expect(apUpdate).toHaveBeenCalled();
  });

  it("manager succeeds", async () => {
    gs.mockResolvedValue({ user: { id: "m" } } as any);
    fu.mockResolvedValue({ id: "m", role: "manager" } as any);
    const res = await updateAssignment(validInput);
    expect(res).toMatchObject({ data: { id: "ap1" } });
    expect(apUpdate).toHaveBeenCalled();
  });
});
