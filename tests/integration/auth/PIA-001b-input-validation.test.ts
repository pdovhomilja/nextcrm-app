import { describe, expect, it } from "vitest";
import { http } from "../helpers/auth";

const EMAIL = process.env.TEST_USER_EMAIL ?? "admin@example.com";

describe("PIA-001b input validation for send-verification-otp", () => {
  it("rejects an obviously invalid email with 400", async () => {
    const resp = await http().post("api/auth/email-otp/send-verification-otp", {
      json: { email: "not-an-email", type: "sign-in" },
      throwHttpErrors: false,
    });
    expect(resp.status).toBe(400);
  });

  it("rejects a missing type with 400", async () => {
    const resp = await http().post("api/auth/email-otp/send-verification-otp", {
      json: { email: EMAIL },
      throwHttpErrors: false,
    });
    expect(resp.status).toBe(400);
  });
});
