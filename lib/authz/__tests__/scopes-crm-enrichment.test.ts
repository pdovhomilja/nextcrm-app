import { AuthorizationError } from "../errors";

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Contact_Enrichment: { findUnique: jest.fn() },
    crm_Target_Enrichment: { findUnique: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  assertCanCancelContactEnrichment,
  assertCanCancelTargetEnrichment,
} from "../scopes/crm";

const findContactE = prismadb.crm_Contact_Enrichment.findUnique as jest.MockedFunction<
  typeof prismadb.crm_Contact_Enrichment.findUnique
>;
const findTargetE = prismadb.crm_Target_Enrichment.findUnique as jest.MockedFunction<
  typeof prismadb.crm_Target_Enrichment.findUnique
>;

beforeEach(() => jest.clearAllMocks());

describe("assertCanCancelContactEnrichment", () => {
  it("throws when enrichment not found", async () => {
    findContactE.mockResolvedValue(null);
    await expect(
      assertCanCancelContactEnrichment({ id: "u", role: "user" }, "e1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("user: passes when triggeredBy matches", async () => {
    findContactE.mockResolvedValue({ id: "e1", triggeredBy: "u1" } as any);
    await expect(
      assertCanCancelContactEnrichment({ id: "u1", role: "user" }, "e1"),
    ).resolves.toBeUndefined();
  });

  it("user: throws when triggeredBy is someone else", async () => {
    findContactE.mockResolvedValue({ id: "e1", triggeredBy: "other" } as any);
    await expect(
      assertCanCancelContactEnrichment({ id: "u1", role: "user" }, "e1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("manager: passes regardless of triggeredBy", async () => {
    findContactE.mockResolvedValue({ id: "e1", triggeredBy: "other" } as any);
    await expect(
      assertCanCancelContactEnrichment({ id: "m1", role: "manager" }, "e1"),
    ).resolves.toBeUndefined();
  });

  it("admin: passes regardless of triggeredBy", async () => {
    findContactE.mockResolvedValue({ id: "e1", triggeredBy: null } as any);
    await expect(
      assertCanCancelContactEnrichment({ id: "a1", role: "admin" }, "e1"),
    ).resolves.toBeUndefined();
  });
});

describe("assertCanCancelTargetEnrichment", () => {
  it("user: passes when triggeredBy matches", async () => {
    findTargetE.mockResolvedValue({ id: "e1", triggeredBy: "u1" } as any);
    await expect(
      assertCanCancelTargetEnrichment({ id: "u1", role: "user" }, "e1"),
    ).resolves.toBeUndefined();
  });

  it("user: throws when triggeredBy is someone else", async () => {
    findTargetE.mockResolvedValue({ id: "e1", triggeredBy: "other" } as any);
    await expect(
      assertCanCancelTargetEnrichment({ id: "u1", role: "user" }, "e1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("throws when not found", async () => {
    findTargetE.mockResolvedValue(null);
    await expect(
      assertCanCancelTargetEnrichment({ id: "u1", role: "user" }, "e1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
