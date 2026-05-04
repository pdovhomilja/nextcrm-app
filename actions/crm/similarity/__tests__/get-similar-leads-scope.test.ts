jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Leads: { findFirst: jest.fn(), findMany: jest.fn() },
    $queryRaw: jest.fn(),
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getSimilarLeads } from "../get-similar-leads";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

beforeEach(() => jest.clearAllMocks());

describe("getSimilarLeads scope", () => {
  it("unauthenticated → empty records, no SQL", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getSimilarLeads("l1");
    expect(res).toEqual({ status: "ok", records: [] });
    expect(prismadb.$queryRaw).not.toHaveBeenCalled();
  });

  it("user can't read base lead → empty records, no SQL", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Leads.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getSimilarLeads("l1");
    expect(res).toEqual({ status: "ok", records: [] });
    expect(prismadb.$queryRaw).not.toHaveBeenCalled();
  });

  it("in-scope user: returns only authorized similar candidates", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Leads.findFirst as jest.Mock).mockResolvedValue({ id: "l1" });
    (prismadb.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ embedding: "[0.1]" }])
      .mockResolvedValueOnce([
        { id: "z1", firstName: "A", lastName: "B", status: null, similarity: 0.9 },
        { id: "z2", firstName: "C", lastName: "D", status: null, similarity: 0.8 },
        { id: "z3", firstName: "E", lastName: "F", status: null, similarity: 0.7 },
        { id: "z4", firstName: "G", lastName: "H", status: null, similarity: 0.6 },
        { id: "z5", firstName: "I", lastName: "J", status: null, similarity: 0.5 },
      ]);
    (prismadb.crm_Leads.findMany as jest.Mock).mockResolvedValue([
      { id: "z2" },
      { id: "z5" },
    ]);

    const res = await getSimilarLeads("l1", 5);
    if (res.status !== "ok") throw new Error("expected ok");
    expect(res.records.map((r) => r.id)).toEqual(["z2", "z5"]);
  });

  it("manager: returns unfiltered candidates", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Leads.findFirst as jest.Mock).mockResolvedValue({ id: "l1" });
    (prismadb.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ embedding: "[0.1]" }])
      .mockResolvedValueOnce([
        { id: "z1", firstName: "A", lastName: "B", status: null, similarity: 0.9 },
        { id: "z2", firstName: "C", lastName: "D", status: null, similarity: 0.8 },
      ]);
    (prismadb.crm_Leads.findMany as jest.Mock).mockResolvedValue([
      { id: "z1" },
      { id: "z2" },
    ]);

    const res = await getSimilarLeads("l1");
    if (res.status !== "ok") throw new Error("expected ok");
    expect(res.records.map((r) => r.id)).toEqual(["z1", "z2"]);
  });
});
