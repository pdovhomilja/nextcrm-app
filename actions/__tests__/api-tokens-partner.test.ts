jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/api-tokens", () => ({ generateApiToken: jest.fn(async () => ({ token: "nxtc__x" })), listApiTokens: jest.fn(), revokeApiToken: jest.fn() }));

import { getSession } from "@/lib/auth-server";
import { generateApiToken } from "@/lib/api-tokens";
import { createApiToken } from "@/actions/api-tokens";

const gs = getSession as jest.Mock;

beforeEach(() => jest.clearAllMocks());

// getSession lets partners in (partner app, ticket 4); this guard keeps API
// tokens closed to them (spec decision 6).
it("refuses to create an API token for a partner", async () => {
  gs.mockResolvedValue({ user: { id: "p1", role: "partner", userStatus: "ACTIVE" } });
  expect(await createApiToken({ name: "t" })).toEqual({ error: "Forbidden" });
  expect(generateApiToken).not.toHaveBeenCalled();
});

it("still creates one for a user", async () => {
  gs.mockResolvedValue({ user: { id: "u1", role: "user", userStatus: "ACTIVE" } });
  expect(await createApiToken({ name: "t" })).toEqual({ data: { token: "nxtc__x" } });
});
