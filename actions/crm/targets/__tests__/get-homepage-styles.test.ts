// Read of the active ORG HOMEPAGE_STYLE options for the drawer's one-shot Style
// dropdown. The denial test must fail against an implementation that skips the
// read-authz guard.

jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanReadTarget: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Ai_Prompt: { findMany: jest.fn() },
    crm_Targets: { findUnique: jest.fn() },
  },
}));

import {
  requireAuthenticated,
  assertCanReadTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { getHomepageStyles } from "../get-homepage-styles";

const authed = requireAuthenticated as jest.Mock;
const assertRead = assertCanReadTarget as jest.Mock;
const pMany = prismadb.crm_Ai_Prompt.findMany as jest.Mock;
const tFind = prismadb.crm_Targets.findUnique as jest.Mock;

const USER = { id: "u-1", role: "user" };
const TARGET = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(USER);
  assertRead.mockResolvedValue(undefined);
  pMany.mockResolvedValue([
    { id: "a", name: "Bold Editorial" },
    { id: "b", name: "Minimal" },
  ]);
  tFind.mockResolvedValue({ homepage_style_prompt_id: null });
});

describe("getHomepageStyles", () => {
  it("rejects an unauthenticated caller", async () => {
    authed.mockRejectedValue(new AuthenticationError());
    const res = await getHomepageStyles({ targetId: TARGET });
    expect(res).toEqual({ error: "Unauthorized" });
    expect(pMany).not.toHaveBeenCalled();
  });

  it("denies a caller who may not read the target", async () => {
    assertRead.mockRejectedValue(new AuthorizationError());
    const res = await getHomepageStyles({ targetId: TARGET });
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertRead).toHaveBeenCalledWith(USER, TARGET);
    expect(pMany).not.toHaveBeenCalled();
  });

  it("returns the active ORG HOMEPAGE_STYLE options (id + name only), selectedId null when none saved", async () => {
    const res = await getHomepageStyles({ targetId: TARGET });
    expect(res).toEqual({
      data: {
        options: [
          { id: "a", name: "Bold Editorial" },
          { id: "b", name: "Minimal" },
        ],
        selectedId: null,
      },
    });
    expect(pMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          kind: "HOMEPAGE_STYLE",
          scope: "ORG",
          deletedAt: null,
        }),
      }),
    );
  });

  it("surfaces the target's remembered style as selectedId when it is still an active option", async () => {
    tFind.mockResolvedValue({ homepage_style_prompt_id: "b" });
    const res = await getHomepageStyles({ targetId: TARGET });
    expect(res).toEqual({
      data: {
        options: [
          { id: "a", name: "Bold Editorial" },
          { id: "b", name: "Minimal" },
        ],
        selectedId: "b",
      },
    });
  });

  it("falls back to selectedId null when the remembered style is no longer an option", async () => {
    tFind.mockResolvedValue({ homepage_style_prompt_id: "removed-style" });
    const res = await getHomepageStyles({ targetId: TARGET });
    expect(res).toEqual({
      data: {
        options: [
          { id: "a", name: "Bold Editorial" },
          { id: "b", name: "Minimal" },
        ],
        selectedId: null,
      },
    });
  });

  it("returns an empty option list when the library is empty", async () => {
    pMany.mockResolvedValue([]);
    const res = await getHomepageStyles({ targetId: TARGET });
    expect(res).toEqual({ data: { options: [], selectedId: null } });
  });

  it("requires a targetId", async () => {
    const res = await getHomepageStyles({ targetId: "" });
    expect(res).toEqual({ error: "targetId is required" });
    expect(authed).not.toHaveBeenCalled();
  });
});
