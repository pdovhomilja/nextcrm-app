jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Contacts: { findFirst: jest.fn() },
    crm_Targets: { findFirst: jest.fn() },
    crm_Leads: { findFirst: jest.fn() },
    crm_Opportunities: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { matchCounterparty } from "../match";

const contacts = prismadb.crm_Contacts.findFirst as jest.Mock;
const targets = prismadb.crm_Targets.findFirst as jest.Mock;
const leads = prismadb.crm_Leads.findFirst as jest.Mock;
const opps = prismadb.crm_Opportunities.findMany as jest.Mock;

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
  });

  it("returns [] when nothing matches", async () => {
    contacts.mockResolvedValue(null);
    targets.mockResolvedValue(null);
    leads.mockResolvedValue(null);
    expect(await matchCounterparty(["x@y.com"])).toEqual([]);
  });
});
