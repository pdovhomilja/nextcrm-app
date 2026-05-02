jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Contacts: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getContact } from "@/actions/crm/get-contact";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getContact scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns null and does not query contact", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getContact("c1");
    expect(res).toBeNull();
    expect(prismadb.crm_Contacts.findFirst).not.toHaveBeenCalled();
  });

  it("user out-of-scope returns null (assert miss)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Contacts.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getContact("c1");
    expect(res).toBeNull();
    expect(prismadb.crm_Contacts.findFirst).toHaveBeenCalledTimes(1);
  });

  it("owner returns contact detail", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Contacts.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "c1" })
      .mockResolvedValueOnce({ id: "c1", first_name: "Alice" });
    const res = await getContact("c1");
    expect(res).toEqual({ id: "c1", first_name: "Alice" });
    expect(prismadb.crm_Contacts.findFirst).toHaveBeenCalledTimes(2);
  });

  it("manager returns contact detail (no OR in assert where)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Contacts.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "c1" })
      .mockResolvedValueOnce({ id: "c1", first_name: "Alice" });
    const res = await getContact("c1");
    expect(res).toEqual({ id: "c1", first_name: "Alice" });
    const assertCall = (prismadb.crm_Contacts.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
  });
});
