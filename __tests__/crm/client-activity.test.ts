jest.mock("@/lib/prisma", () => ({
  prismadb: {
    email: { findFirst: jest.fn() },
    crm_Activities: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getLastClientActivity } from "@/lib/crm/client-activity";

describe("getLastClientActivity", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the max of stage entry, inbound email, and logged activity", async () => {
    (prismadb.email.findFirst as jest.Mock).mockResolvedValue({
      sentAt: new Date("2026-06-10"),
    });
    (prismadb.crm_Activities.findFirst as jest.Mock).mockResolvedValue({
      date: new Date("2026-06-20"),
    });
    const res = await getLastClientActivity({
      id: "o1", contact: "c1", account: "a1",
      stage_entered_at: new Date("2026-05-01"),
    });
    expect(res).toEqual(new Date("2026-06-20"));
  });

  it("queries inbound emails only, scoped to the deal's contact/account", async () => {
    (prismadb.email.findFirst as jest.Mock).mockResolvedValue(null);
    (prismadb.crm_Activities.findFirst as jest.Mock).mockResolvedValue(null);
    await getLastClientActivity({
      id: "o1", contact: "c1", account: "a1", stage_entered_at: null,
    });
    const where = (prismadb.email.findFirst as jest.Mock).mock.calls[0][0].where;
    expect(where.folder).toBe("INBOX");
    expect(where.OR).toEqual([
      { contacts: { some: { contactId: "c1" } } },
      { accounts: { some: { accountId: "a1" } } },
    ]);
  });

  it("skips the email query entirely when the deal has no contact and no account", async () => {
    (prismadb.crm_Activities.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getLastClientActivity({
      id: "o1", contact: null, account: null,
      stage_entered_at: new Date("2026-05-01"),
    });
    expect(prismadb.email.findFirst).not.toHaveBeenCalled();
    expect(res).toEqual(new Date("2026-05-01"));
  });

  it("excludes cancelled activities from the kill-clock query so a cancelled future meeting can't hold a deal active, while a scheduled one still counts", async () => {
    (prismadb.email.findFirst as jest.Mock).mockResolvedValue(null);
    // Simulate Prisma applying the status filter: a cancelled-only activity set
    // resolves to null, as the real DB would exclude it via `status: { not: "cancelled" }`.
    (prismadb.crm_Activities.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await getLastClientActivity({
      id: "o1", contact: "c1", account: "a1",
      stage_entered_at: new Date("2026-05-01"),
    });

    const where = (prismadb.crm_Activities.findFirst as jest.Mock).mock.calls[0][0].where;
    expect(where.status).toEqual({ not: "cancelled" });
    // With the cancelled activity excluded, the clock falls back to stage entry.
    expect(res).toEqual(new Date("2026-05-01"));

    // A scheduled activity, by contrast, still counts and wins the max().
    (prismadb.crm_Activities.findFirst as jest.Mock).mockResolvedValue({
      date: new Date("2026-06-15"),
    });
    const res2 = await getLastClientActivity({
      id: "o1", contact: "c1", account: "a1",
      stage_entered_at: new Date("2026-05-01"),
    });
    expect(res2).toEqual(new Date("2026-06-15"));
  });
});
