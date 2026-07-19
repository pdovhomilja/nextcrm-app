import { isAuthRevocationError } from "../google-sync-connection";

describe("isAuthRevocationError", () => {
  it("returns true for a token-endpoint 400 invalid_grant (revoked/expired refresh token)", () => {
    const error = {
      code: 400,
      message: "invalid_grant",
      response: { data: { error: "invalid_grant" } },
    };
    expect(isAuthRevocationError(error)).toBe(true);
  });

  it("returns true for a plain 401", () => {
    const error = { code: 401, message: "Invalid Credentials" };
    expect(isAuthRevocationError(error)).toBe(true);
  });

  it("returns false for a 403 rateLimitExceeded (transient, must not deactivate)", () => {
    const error = {
      code: 403,
      message: "Rate Limit Exceeded",
      response: {
        data: {
          error: {
            message: "Rate Limit Exceeded",
            errors: [{ reason: "rateLimitExceeded" }],
          },
        },
      },
    };
    expect(isAuthRevocationError(error)).toBe(false);
  });

  it("returns true for a 403 without a rate-limit marker (genuine auth revocation)", () => {
    const error = {
      code: 403,
      message: "Insufficient Permission",
      response: {
        data: {
          error: {
            message: "Insufficient Permission",
            errors: [{ reason: "insufficientPermissions" }],
          },
        },
      },
    };
    expect(isAuthRevocationError(error)).toBe(true);
  });

  it("returns false for an unrelated 500 error", () => {
    const error = { code: 500, message: "Internal Server Error" };
    expect(isAuthRevocationError(error)).toBe(false);
  });
});
