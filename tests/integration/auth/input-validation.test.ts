import { describe, expect, it } from "vitest";
import { http } from "../helpers/auth";

const EMAIL = process.env.TEST_USER_EMAIL ?? "admin@example.com";

describe("PIA-001b input validation for send-verification-otp", () => {
  it("rejects an obviously invalid email with 400", {
    meta: {
      id: "PIA-004",
      endpoint: "POST api/auth/email-otp/send-verification-otp",
      objective: "Verificar que el sistema rechace la solicitud con un código de estado cuatrocientos cuando la dirección de correo electrónico provista no posee un formato válido",
      expectedStatus: 400,
      body: { email: "not-an-email", type: "sign-in" },
      notes: "Validación de formato de correo electrónico"
    }
  }, async () => {
    const resp = await http().post("api/auth/email-otp/send-verification-otp", {
      json: { email: "not-an-email", type: "sign-in" },
      throwHttpErrors: false,
    });
    expect(resp.status).toBe(400);
  });

  it("rejects a missing type with 400", {
    meta: {
      id: "PIA-005",
      endpoint: "POST api/auth/email-otp/send-verification-otp",
      objective: "Verificar que el sistema rechace la solicitud con un código de estado cuatrocientos cuando no se proporciona el tipo de operación requerido",
      expectedStatus: 400,
      body: { email: EMAIL },
      notes: "Validación de parámetros requeridos en el cuerpo de la solicitud"
    }
  }, async () => {
    const resp = await http().post("api/auth/email-otp/send-verification-otp", {
      json: { email: EMAIL },
      throwHttpErrors: false,
    });
    expect(resp.status).toBe(400);
  });
});
