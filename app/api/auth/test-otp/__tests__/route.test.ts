jest.mock("@/lib/auth", () => ({
  auth: {
    $context: Promise.resolve({
      test: { getOTP: (email: string) => (email === "a@example.com" ? "123456" : undefined) },
    }),
  },
}));

import { NextRequest } from "next/server";
import { GET } from "../route";

const env = process.env as Record<string, string | undefined>;
const original = { NODE_ENV: env.NODE_ENV, NEXTCRM_E2E_TEST_OTP: env.NEXTCRM_E2E_TEST_OTP };

afterEach(() => {
  env.NODE_ENV = original.NODE_ENV;
  env.NEXTCRM_E2E_TEST_OTP = original.NEXTCRM_E2E_TEST_OTP;
});

function req() {
  return new NextRequest("http://localhost/api/auth/test-otp?email=a%40example.com");
}

describe("GET /api/auth/test-otp", () => {
  it("is 404 outside production when the opt-in flag is not set", async () => {
    env.NODE_ENV = "development";
    delete env.NEXTCRM_E2E_TEST_OTP;
    expect((await GET(req())).status).toBe(404);
  });

  it("is 404 when the flag has any value other than 1", async () => {
    env.NODE_ENV = "development";
    env.NEXTCRM_E2E_TEST_OTP = "true";
    expect((await GET(req())).status).toBe(404);
  });

  it("returns the captured code outside production with the flag set to 1", async () => {
    env.NODE_ENV = "development";
    env.NEXTCRM_E2E_TEST_OTP = "1";
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ otp: "123456" });
  });

  it("is 404 in production even with the flag set", async () => {
    env.NODE_ENV = "production";
    env.NEXTCRM_E2E_TEST_OTP = "1";
    expect((await GET(req())).status).toBe(404);
  });
});
