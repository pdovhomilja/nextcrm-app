import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prismadb } from "@/lib/prisma";
import { getCapturedOtp, http, requestSignInOtp, signInAsAdmin } from "../helpers/auth";

const EMAIL = process.env.TEST_USER_EMAIL ?? "admin@example.com";

describe("PIA-001 request OTP for registered email", () => {
  let sessionCookie: string | null = null;

  beforeAll(async () => {
    const session = await signInAsAdmin();
    sessionCookie = session.cookie;
  });

  afterAll(async () => {
    void sessionCookie;
  });

  it("returns 200 when posting a valid email + type=sign-in", async () => {
    const resp = await http().post("api/auth/email-otp/send-verification-otp", {
      json: { email: EMAIL, type: "sign-in" },
      throwHttpErrors: false,
    });
    expect(resp.status).toBe(200);
  });

  it("captures the OTP via the testUtils plugin", async () => {
    await requestSignInOtp(EMAIL);
    let otp: string | null = null;
    for (let i = 0; i < 10 && !otp; i++) {
      otp = await getCapturedOtp(EMAIL);
      if (!otp) await new Promise((r) => setTimeout(r, 100));
    }
    expect(otp).not.toBeNull();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it("persists a verification row for the requested email", async () => {
    await requestSignInOtp(EMAIL);

    let row: { value: string; expiresAt: Date } | null = null;
    for (let i = 0; i < 10 && !row; i++) {
      row = await prismadb.verification.findFirst({
        where: { identifier: `sign-in-otp-${EMAIL}` },
        orderBy: { createdAt: "desc" },
        select: { value: true, expiresAt: true },
      });
      if (!row) await new Promise((r) => setTimeout(r, 100));
    }

    expect(row, "verification row must exist after send-verification-otp").not.toBeNull();
    const otp = row?.value.split(":")[0] ?? "";
    expect(otp).toMatch(/^\d{6}$/);
    expect(row?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
