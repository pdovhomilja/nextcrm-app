import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prismadb } from "@/lib/prisma";
import { http, type IntegrationSession, signInAsAdmin } from "../helpers/auth";

const EMAIL = process.env.TEST_USER_EMAIL ?? "admin@example.com";

describe("PIA-002 verify valid OTP and obtain session cookie", () => {
  let session: IntegrationSession;

  beforeAll(async () => {
    session = await signInAsAdmin();
  });

  afterAll(() => {
    void session;
  });

  it("get-session returns the user matching the email", {
    meta: {
      id: "PIA-006",
      endpoint: "GET api/auth/get-session",
      objective: "Verificar que el endpoint de obtención de sesión retorne la información del usuario correspondiente a la cookie de sesión provista",
      expectedStatus: 200,
      params: "Encabezado de cookie de sesión activa",
      notes: "Retorno de sesión válida"
    }
  }, async () => {
    const me = await http()
      .get("api/auth/get-session", {
        headers: { cookie: session.cookie },
      })
      .json<{ user?: { id: string; email: string } }>();
    expect(me.user?.email).toBe(EMAIL);
    expect(me.user?.id).toBe(session.userId);
  });

  it("returns the same user on a second get-session call (session is reusable)", {
    meta: {
      id: "PIA-007",
      endpoint: "GET api/auth/get-session",
      objective: "Validar que la sesión de usuario sea reutilizable en múltiples llamadas consecutivas",
      expectedStatus: 200,
      params: "Encabezado de cookie de sesión activa",
      notes: "Reutilización exitosa de la cookie de sesión"
    }
  }, async () => {
    const me = await http()
      .get("api/auth/get-session", {
        headers: { cookie: session.cookie },
      })
      .json<{ user?: { id: string; email: string } }>();
    expect(me.user?.id).toBe(session.userId);
  });

  it("persists a session row in the database", {
    meta: {
      id: "PIA-008",
      endpoint: "GET api/auth/get-session",
      objective: "Confirmar la existencia de un registro activo de sesión en la base de datos para el usuario autenticado",
      expectedStatus: "Registro de sesión activo",
      notes: "Verificación a nivel de persistencia de sesiones"
    }
  }, async () => {
    const rows = await prismadb.session.findMany({
      where: { userId: session.userId },
      select: { id: true, userId: true, expiresAt: true },
    });
    expect(rows.length, "at least one session row for the signed-in user").toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now());
    }
  });
});
