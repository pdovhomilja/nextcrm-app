// Scoped write of crm_Targets.homepage_industry_prompt_id. Denial tests must
// fail against an implementation that skips the authz guard.

jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteTarget: jest.fn(),
  assertCanReadTarget: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    crm_Ai_Prompt: { findFirst: jest.fn(), findMany: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({
  writeAuditLog: jest.fn(),
  diffObjects: jest.fn().mockReturnValue([]),
}));

import {
  requireAuthenticated,
  assertCanWriteTarget,
  assertCanReadTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { setHomepageIndustry } from "../set-homepage-industry";
import { getHomepageIndustry } from "../get-homepage-industry";

const authed = requireAuthenticated as jest.Mock;
const assertWrite = assertCanWriteTarget as jest.Mock;
const assertRead = assertCanReadTarget as jest.Mock;
const tFind = prismadb.crm_Targets.findFirst as jest.Mock;
const tUpdate = prismadb.crm_Targets.update as jest.Mock;
const pFind = prismadb.crm_Ai_Prompt.findFirst as jest.Mock;
const pMany = prismadb.crm_Ai_Prompt.findMany as jest.Mock;

const USER = { id: "u-1", role: "user" };
const TARGET = "11111111-1111-4111-8111-111111111111";
const PROMPT = "00000000-0000-4000-8000-000000001d05";

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(USER);
  assertWrite.mockResolvedValue(undefined);
  assertRead.mockResolvedValue(undefined);
  tFind.mockResolvedValue({ id: TARGET, homepage_industry_prompt_id: null });
  tUpdate.mockResolvedValue({ id: TARGET, homepage_industry_prompt_id: PROMPT });
  pFind.mockResolvedValue({ id: PROMPT });
});

describe("setHomepageIndustry", () => {
  it("rejects an unauthenticated caller", async () => {
    authed.mockRejectedValue(new AuthenticationError());
    const res = await setHomepageIndustry({ targetId: TARGET, promptId: PROMPT });
    expect(res).toEqual({ error: "Unauthorized" });
    expect(tUpdate).not.toHaveBeenCalled();
  });

  it("rejects a caller who may not edit the target and does not write", async () => {
    assertWrite.mockRejectedValue(new AuthorizationError());
    const res = await setHomepageIndustry({ targetId: TARGET, promptId: PROMPT });
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertWrite).toHaveBeenCalledWith(USER, TARGET);
    expect(tUpdate).not.toHaveBeenCalled();
  });

  it("persists a valid active ORG HOMEPAGE_INDUSTRY prompt id", async () => {
    const res = await setHomepageIndustry({ targetId: TARGET, promptId: PROMPT });
    expect(res).toEqual({ data: { promptId: PROMPT } });
    expect(pFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: PROMPT,
          kind: "HOMEPAGE_INDUSTRY",
          scope: "ORG",
          deletedAt: null,
        }),
      }),
    );
    expect(tUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TARGET },
        data: expect.objectContaining({ homepage_industry_prompt_id: PROMPT }),
      }),
    );
  });

  it("rejects an id that is not an existing industry prompt (wrong kind / deleted / unknown)", async () => {
    pFind.mockResolvedValue(null);
    const res = await setHomepageIndustry({ targetId: TARGET, promptId: PROMPT });
    expect(res).toEqual({ error: "Unknown industry prompt" });
    expect(tUpdate).not.toHaveBeenCalled();
  });

  it("rejects a non-uuid prompt id without querying (uuid column would throw)", async () => {
    const res = await setHomepageIndustry({ targetId: TARGET, promptId: "not-a-uuid" });
    expect(res).toEqual({ error: "Unknown industry prompt" });
    expect(pFind).not.toHaveBeenCalled();
    expect(tUpdate).not.toHaveBeenCalled();
  });

  it("clears the selection with null (falls back to Generic at read time)", async () => {
    tUpdate.mockResolvedValue({ id: TARGET, homepage_industry_prompt_id: null });
    const res = await setHomepageIndustry({ targetId: TARGET, promptId: null });
    expect(res).toEqual({ data: { promptId: null } });
    expect(pFind).not.toHaveBeenCalled();
    expect(tUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ homepage_industry_prompt_id: null }),
      }),
    );
  });

  it("returns not-found for a missing/soft-deleted target", async () => {
    tFind.mockResolvedValue(null);
    const res = await setHomepageIndustry({ targetId: TARGET, promptId: PROMPT });
    expect(res).toEqual({ error: "Target not found" });
    expect(tUpdate).not.toHaveBeenCalled();
  });
});

describe("getHomepageIndustry", () => {
  const options = [
    { id: "a", name: "Dental", is_default: false },
    { id: "g", name: "Generic", is_default: true },
  ];

  it("denies a caller who may not read the target", async () => {
    assertRead.mockRejectedValue(new AuthorizationError());
    const res = await getHomepageIndustry({ targetId: TARGET });
    expect(res).toEqual({ error: "Forbidden" });
    expect(pMany).not.toHaveBeenCalled();
  });

  it("returns options plus the saved selection", async () => {
    pMany.mockResolvedValue(options);
    tFind.mockResolvedValue({ homepage_industry_prompt_id: "a" });
    const res = await getHomepageIndustry({ targetId: TARGET });
    expect(res).toEqual({
      data: {
        options: [
          { id: "a", name: "Dental" },
          { id: "g", name: "Generic" },
        ],
        selectedId: "a",
        defaultId: "g",
      },
    });
  });

  it("selectedId falls back to null when the saved id is no longer an active option", async () => {
    pMany.mockResolvedValue(options);
    tFind.mockResolvedValue({ homepage_industry_prompt_id: "deleted-one" });
    const res = await getHomepageIndustry({ targetId: TARGET });
    expect(res).toMatchObject({ data: { selectedId: null, defaultId: "g" } });
  });
});
