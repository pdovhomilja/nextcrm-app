jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Contacts: { findFirst: jest.fn() },
    crm_Targets: { findFirst: jest.fn() },
    crm_Leads: { findFirst: jest.fn() },
    crm_Opportunities: { findMany: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { matchCounterparty } from "../match";

const contacts = prismadb.crm_Contacts.findFirst as jest.Mock;
const targets = prismadb.crm_Targets.findFirst as jest.Mock;
const leads = prismadb.crm_Leads.findFirst as jest.Mock;
const opps = prismadb.crm_Opportunities.findMany as jest.Mock;
const accounts = prismadb.crm_Accounts.findFirst as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("matchCounterparty", () => {
  it("returns [] for empty input without querying", async () => {
    expect(await matchCounterparty([])).toEqual([]);
    expect(contacts).not.toHaveBeenCalled();
  });

  it("matches contact and links account + single open opportunity", async () => {
    contacts.mockResolvedValue({ id: "c1", accountsIDs: "a1" });
    opps.mockResolvedValue([{ id: "o1" }]);
    const links = await matchCounterparty(["jane@client.com"]);
    expect(links).toEqual([
      { entityType: "contact", entityId: "c1" },
      { entityType: "account", entityId: "a1" },
      { entityType: "opportunity", entityId: "o1" },
    ]);
    expect(contacts).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      })
    );
  });

  it("skips opportunity link when the account has several open deals", async () => {
    contacts.mockResolvedValue({ id: "c1", accountsIDs: "a1" });
    opps.mockResolvedValue([{ id: "o1" }, { id: "o2" }]);
    const links = await matchCounterparty(["jane@client.com"]);
    expect(links).toEqual([
      { entityType: "contact", entityId: "c1" },
      { entityType: "account", entityId: "a1" },
    ]);
  });

  it("falls back to target, then lead", async () => {
    contacts.mockResolvedValue(null);
    targets.mockResolvedValue({ id: "t1" });
    expect(await matchCounterparty(["x@y.com"])).toEqual([
      { entityType: "target", entityId: "t1" },
    ]);

    targets.mockResolvedValue(null);
    leads.mockResolvedValue({ id: "l1" });
    expect(await matchCounterparty(["x@y.com"])).toEqual([
      { entityType: "lead", entityId: "l1" },
    ]);
    expect(leads).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      })
    );
  });

  it("returns [] when nothing matches", async () => {
    contacts.mockResolvedValue(null);
    targets.mockResolvedValue(null);
    leads.mockResolvedValue(null);
    expect(await matchCounterparty(["x@y.com"])).toEqual([]);
  });

  describe("with a scope user", () => {
    const rep = { id: "u1", role: "user" as const };
    // A plain user's read scope includes records assigned to them.
    const scoped = expect.objectContaining({
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          expect.objectContaining({ OR: expect.arrayContaining([{ assigned_to: "u1" }]) }),
        ]),
      }),
    });

    it("looks up contacts, targets and leads inside the user's scope", async () => {
      contacts.mockResolvedValue(null);
      targets.mockResolvedValue(null);
      leads.mockResolvedValue(null);
      expect(await matchCounterparty(["jane@client.com"], rep)).toEqual([]);
      expect(contacts).toHaveBeenCalledWith(scoped);
      expect(leads).toHaveBeenCalledWith(scoped);
      expect(targets).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ AND: expect.any(Array) }) })
      );
    });

    it("does not link the contact's account or deal when the user cannot read the account", async () => {
      contacts.mockResolvedValue({ id: "c1", accountsIDs: "a1" });
      accounts.mockResolvedValue(null);
      opps.mockResolvedValue([{ id: "o1" }]);
      expect(await matchCounterparty(["jane@client.com"], rep)).toEqual([{ entityType: "contact", entityId: "c1" }]);
    });

    it("links a readable account and only a readable open deal", async () => {
      contacts.mockResolvedValue({ id: "c1", accountsIDs: "a1" });
      accounts.mockResolvedValue({ id: "a1" });
      opps.mockResolvedValue([{ id: "o1" }]);
      const links = await matchCounterparty(["jane@client.com"], rep);
      expect(links).toEqual([
        { entityType: "contact", entityId: "c1" },
        { entityType: "account", entityId: "a1" },
        { entityType: "opportunity", entityId: "o1" },
      ]);
      expect(opps).toHaveBeenCalledWith(scoped);
    });
  });
});
