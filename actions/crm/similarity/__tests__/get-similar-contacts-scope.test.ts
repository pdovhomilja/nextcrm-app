jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Contacts: { findFirst: jest.fn(), findMany: jest.fn() },
    $queryRaw: jest.fn(),
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getSimilarContacts } from "../get-similar-contacts";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

beforeEach(() => jest.clearAllMocks());

describe("getSimilarContacts scope", () => {
  it("unauthenticated → empty records, no SQL", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getSimilarContacts("c1");
    expect(res).toEqual({ status: "ok", records: [] });
    expect(prismadb.$queryRaw).not.toHaveBeenCalled();
  });

  it("user can't read base contact → empty records, no SQL", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Contacts.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getSimilarContacts("c1");
    expect(res).toEqual({ status: "ok", records: [] });
    expect(prismadb.$queryRaw).not.toHaveBeenCalled();
  });

  it("in-scope user: returns only authorized similar candidates", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Contacts.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ embedding: "[0.1]" }])
      .mockResolvedValueOnce([
        { id: "y1", first_name: "A", last_name: "B", position: null, similarity: 0.9 },
        { id: "y2", first_name: "C", last_name: "D", position: null, similarity: 0.8 },
        { id: "y3", first_name: "E", last_name: "F", position: null, similarity: 0.7 },
        { id: "y4", first_name: "G", last_name: "H", position: null, similarity: 0.6 },
        { id: "y5", first_name: "I", last_name: "J", position: null, similarity: 0.5 },
      ]);
    (prismadb.crm_Contacts.findMany as jest.Mock).mockResolvedValue([
      { id: "y1" },
      { id: "y3" },
    ]);

    const res = await getSimilarContacts("c1", 5);
    if (res.status !== "ok") throw new Error("expected ok");
    expect(res.records.map((r) => r.id)).toEqual(["y1", "y3"]);
  });

  it("manager: returns unfiltered candidates", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Contacts.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ embedding: "[0.1]" }])
      .mockResolvedValueOnce([
        { id: "y1", first_name: "A", last_name: "B", position: null, similarity: 0.9 },
      ]);
    (prismadb.crm_Contacts.findMany as jest.Mock).mockResolvedValue([{ id: "y1" }]);

    const res = await getSimilarContacts("c1");
    if (res.status !== "ok") throw new Error("expected ok");
    expect(res.records.map((r) => r.id)).toEqual(["y1"]);
  });
});
