// lib/authz's barrel re-exports session helpers that import lib/auth-server
// -> better-auth, which is ESM-only and fails under ts-jest's CJS transform.
// Mock the barrel to expose the real AuthorizationError class (via
// requireActual on the leaf errors module, which has no such chain) — same
// pattern used by other tests that need real AuthorizationError semantics
// without pulling in the auth-server import chain.
jest.mock("@/lib/authz", () => {
  const { AuthorizationError } = jest.requireActual("@/lib/authz/errors");
  return { AuthorizationError };
});

import { assertScopeOrNotFound } from "../helpers";
import { AuthorizationError } from "@/lib/authz";

describe("assertScopeOrNotFound", () => {
  it("converts an AuthorizationError into a NOT_FOUND error", async () => {
    await expect(
      assertScopeOrNotFound(async () => {
        throw new AuthorizationError();
      }, "Board")
    ).rejects.toThrow("NOT_FOUND");
  });

  it("passes through when the assert resolves", async () => {
    await expect(
      assertScopeOrNotFound(async () => {}, "Board")
    ).resolves.toBeUndefined();
  });

  it("propagates non-authorization errors unchanged", async () => {
    await expect(
      assertScopeOrNotFound(async () => {
        throw new Error("db down");
      }, "Board")
    ).rejects.toThrow("db down");
  });
});
