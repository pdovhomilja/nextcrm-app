jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getOriginatingTargetListNames } from "@/lib/crm/deal-source";

describe("getOriginatingTargetListNames", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the originating target's list names", async () => {
    (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({
      target_lists: [{ target_list: { name: "UK Contractors", deletedAt: null } }],
    });

    const result = await getOriginatingTargetListNames({
      accountId: "acc1",
      contactId: "con1",
    });

    expect(result).toEqual(["UK Contractors"]);
    // Reverse lookup is keyed on both converted_* columns + not soft-deleted.
    expect(prismadb.crm_Targets.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          converted_account_id: "acc1",
          converted_contact_id: "con1",
          deletedAt: null,
        }),
      })
    );
  });

  it("returns every list a target belongs to (targets are many-to-many with lists)", async () => {
    (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({
      target_lists: [
        { target_list: { name: "UK Contractors", deletedAt: null } },
        { target_list: { name: "High Priority", deletedAt: null } },
      ],
    });

    const result = await getOriginatingTargetListNames({
      accountId: "acc1",
      contactId: "con1",
    });

    expect(result).toEqual(["UK Contractors", "High Priority"]);
  });

  it("excludes soft-deleted target lists", async () => {
    (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({
      target_lists: [
        { target_list: { name: "Live List", deletedAt: null } },
        { target_list: { name: "Old List", deletedAt: new Date() } },
      ],
    });

    const result = await getOriginatingTargetListNames({
      accountId: "acc1",
      contactId: "con1",
    });

    expect(result).toEqual(["Live List"]);
  });

  it("returns no list names when the deal did not come from a target", async () => {
    (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await getOriginatingTargetListNames({
      accountId: "acc1",
      contactId: "con1",
    });

    expect(result).toEqual([]);
  });

  it("does not attempt the lookup without both account and contact", async () => {
    const result = await getOriginatingTargetListNames({
      accountId: "acc1",
      contactId: null,
    });

    expect(result).toEqual([]);
    expect(prismadb.crm_Targets.findFirst).not.toHaveBeenCalled();
  });
});
