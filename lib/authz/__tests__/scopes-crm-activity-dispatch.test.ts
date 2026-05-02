jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: { findFirst: jest.fn() },
    crm_Leads: { findFirst: jest.fn() },
    crm_Contacts: { findFirst: jest.fn() },
    crm_Opportunities: { findFirst: jest.fn() },
    crm_Contracts: { findFirst: jest.fn() },
    crm_Targets: { findFirst: jest.fn() },
    crm_TargetLists: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { AuthorizationError } from "../errors";
import { assertCanReadActivityForEntity } from "../scopes/crm";

beforeEach(() => {
  jest.clearAllMocks();
});

type ModelKey =
  | "crm_Accounts"
  | "crm_Leads"
  | "crm_Contacts"
  | "crm_Opportunities"
  | "crm_Contracts"
  | "crm_Targets"
  | "crm_TargetLists";

const cases: Array<[string, ModelKey]> = [
  ["account", "crm_Accounts"],
  ["lead", "crm_Leads"],
  ["contact", "crm_Contacts"],
  ["opportunity", "crm_Opportunities"],
  ["contract", "crm_Contracts"],
  ["target", "crm_Targets"],
  ["target_list", "crm_TargetLists"],
  ["targetlist", "crm_TargetLists"],
];

describe("assertCanReadActivityForEntity", () => {
  it.each(cases)(
    "dispatches %s to %s.findFirst",
    async (entityType, model) => {
      (prismadb[model].findFirst as jest.Mock).mockResolvedValue({ id: "x" });
      await assertCanReadActivityForEntity(
        { id: "u", role: "admin" },
        entityType,
        "x",
      );
      expect(prismadb[model].findFirst as jest.Mock).toHaveBeenCalled();
    },
  );

  it("dispatches case-insensitively (Account → account branch)", async () => {
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({
      id: "x",
    });
    await assertCanReadActivityForEntity(
      { id: "u", role: "admin" },
      "Account",
      "x",
    );
    expect(prismadb.crm_Accounts.findFirst as jest.Mock).toHaveBeenCalled();
  });

  it("propagates AuthorizationError when underlying assert rejects", async () => {
    (prismadb.crm_Leads.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      assertCanReadActivityForEntity({ id: "u", role: "user" }, "lead", "x"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("unknown entity type: user → AuthorizationError", async () => {
    await expect(
      assertCanReadActivityForEntity(
        { id: "u", role: "user" },
        "weird_type",
        "x",
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("unknown entity type: manager → resolves silently", async () => {
    await expect(
      assertCanReadActivityForEntity(
        { id: "u", role: "manager" },
        "weird_type",
        "x",
      ),
    ).resolves.toBeUndefined();
  });

  it("unknown entity type: admin → resolves silently", async () => {
    await expect(
      assertCanReadActivityForEntity(
        { id: "u", role: "admin" },
        "weird_type",
        "x",
      ),
    ).resolves.toBeUndefined();
  });
});
