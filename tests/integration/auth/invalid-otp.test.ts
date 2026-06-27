import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prismadb } from "@/lib/prisma";
import { getCapturedOtp, http, requestSignInOtp } from "../helpers/auth";

const EMAIL = process.env.TEST_USER_EMAIL ?? "admin@example.com";

describe("reject invalid OTP", () => {
  let sessionsBefore: number;

  beforeAll(async () => {
    const url = process.env.DATABASE_URL;
    if (url) {
      const client = new Client({ connectionString: url });
      await client.connect();
      try {
        await client.query('DELETE FROM "verification" WHERE identifier LIKE $1', [`%-otp-${EMAIL}`]);
      } finally {
        await client.end();
      }
    }
    await requestSignInOtp(EMAIL);

    sessionsBefore = await prismadb.session.count({
      where: { user: { email: EMAIL } },
    });
  });

  afterAll(() => {});

  it("rejects an OTP that does not match the captured value", {
    meta: {
      id: "PIA-009",
      endpoint: "POST api/auth/sign-in/email-otp",
      objective: "Verificar que el sistema rechace el inicio de sesión y no genere una cookie cuando se proporciona un código de verificación que no coincide con el generado",
      expectedStatus: 400,
      body: { email: EMAIL, otp: "incorrecto" },
      notes: "Rechazo de código de verificación incorrecto"
    }
  }, async () => {
    const realOtp = await getCapturedOtp(EMAIL);
    expect(realOtp).not.toBeNull();
    const bogus = realOtp === "000000" ? "111111" : "000000";

    const resp = await http().post("api/auth/sign-in/email-otp", {
      json: { email: EMAIL, otp: bogus },
      throwHttpErrors: false,
    });

    expect(resp.status).toBeGreaterThanOrEqual(400);

    const setCookie = resp.headers.get("set-cookie") ?? "";
    const hasSession =
      setCookie.includes("better-auth.session_token=") || setCookie.includes("__Secure-better-auth.session_token=");
    expect(hasSession, "no session cookie must be issued on bad OTP").toBe(false);

    const sessionsAfter = await prismadb.session.count({
      where: { user: { email: EMAIL } },
    });
    expect(sessionsAfter, "no session row should be persisted for a failed sign-in").toBe(sessionsBefore);
  });

  it("rejects a non-numeric OTP with 400", {
    meta: {
      id: "PIA-010",
      endpoint: "POST api/auth/sign-in/email-otp",
      objective: "Verificar que el sistema rechace la solicitud con código cuatrocientos cuando el código de verificación contiene caracteres no numéricos",
      expectedStatus: 400,
      body: { email: EMAIL, otp: "abcdef" },
      notes: "Validación de formato de código no numérico"
    }
  }, async () => {
    const resp = await http().post("api/auth/sign-in/email-otp", {
      json: { email: EMAIL, otp: "abcdef" },
      throwHttpErrors: false,
    });
    expect(resp.status).toBeGreaterThanOrEqual(400);
  });

  it("rejects an empty OTP with 400", {
    meta: {
      id: "PIA-011",
      endpoint: "POST api/auth/sign-in/email-otp",
      objective: "Verificar que el sistema rechace la solicitud con código cuatrocientos cuando el código de verificación se envía vacío",
      expectedStatus: 400,
      body: { email: EMAIL, otp: "" },
      notes: "Validación de campo de código de verificación vacío"
    }
  }, async () => {
    const resp = await http().post("api/auth/sign-in/email-otp", {
      json: { email: EMAIL, otp: "" },
      throwHttpErrors: false,
    });
    expect(resp.status).toBeGreaterThanOrEqual(400);
  });
});
