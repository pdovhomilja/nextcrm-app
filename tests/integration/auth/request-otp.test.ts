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

  it("returns 200 when posting a valid email + type=sign-in", {
    meta: {
      id: "PIA-001",
      endpoint: "POST api/auth/email-otp/send-verification-otp",
      objective: "Verificar que el sistema retorne un código de estado doscientos cuando se envía una solicitud válida con una dirección de correo electrónico registrada y el tipo de operación de inicio de sesión",
      expectedStatus: 200,
      body: { email: EMAIL, type: "sign-in" },
      notes: "Solicitud exitosa de envío de código de verificación de un solo uso"
    },
  }, async () => {
    const resp = await http().post("api/auth/email-otp/send-verification-otp", {
      json: { email: EMAIL, type: "sign-in" },
      throwHttpErrors: false,
    });

    expect(resp.status).toBe(200);
  });

  it("captures the OTP via the testUtils plugin", {
    meta: {
      id: "PIA-002",
      endpoint: "POST api/auth/email-otp/send-verification-otp",
      objective: "Confirmar la captura del código de verificación a través de la herramienta auxiliar de pruebas",
      expectedStatus: "Código obtenido exitosamente",
      notes: "Paso intermedio para validar el funcionamiento del flujo de autenticación"
    }
  }, async () => {
    await requestSignInOtp(EMAIL);
    let otp: string | null = null;
    for (let i = 0; i < 10 && !otp; i++) {
      otp = await getCapturedOtp(EMAIL);
      if (!otp) await new Promise((r) => setTimeout(r, 100));
    }
    expect(otp).not.toBeNull();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it("persists a verification row for the requested email", {
    meta: {
      id: "PIA-003",
      endpoint: "POST api/auth/email-otp/send-verification-otp",
      objective: "Validar la persistencia y la fecha de expiración del registro de verificación en la base de datos",
      expectedStatus: "Registro persistido de forma correcta",
      notes: "Verificación a nivel de persistencia de datos"
    }
  }, async () => {
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
