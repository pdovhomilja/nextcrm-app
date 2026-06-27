import ky from "ky";
import { beforeAll, describe, expect, it } from "vitest";
import { prismadb } from "@/lib/prisma";
import { http, type IntegrationSession, signInAsAdmin } from "../helpers/auth";

const BASE_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const EMAIL = process.env.TEST_USER_EMAIL ?? "admin@example.com";

describe("active session validates on protected endpoint", () => {
  let session: IntegrationSession;

  beforeAll(async () => {
    session = await signInAsAdmin();
  });

  it("get-session returns the user for a valid cookie", {
    meta: {
      id: "PIA-012",
      endpoint: "GET api/auth/get-session",
      objective: "Verificar que el endpoint protegido devuelva la información del usuario autenticado al presentar una cookie de sesión válida",
      expectedStatus: 200,
      params: "Encabezado de cookie de sesión activa",
      notes: "Validación exitosa de sesión activa"
    }
  }, async () => {
    const me = await http()
      .get("api/auth/get-session", {
        headers: { cookie: session.cookie },
      })
      .json<{ user?: { id: string; email: string } }>();
    expect(me.user).toBeDefined();
    expect(me.user?.email).toBe(session.email);
    expect(me.user?.id).toBe(session.userId);
  });

  it("get-session returns null/empty for a fabricated cookie", {
    meta: {
      id: "PIA-013",
      endpoint: "GET api/auth/get-session",
      objective: "Validar que el endpoint protegido retorne un valor nulo para el usuario al presentar una cookie de sesión inválida o alterada",
      expectedStatus: 200,
      params: "Encabezado de cookie de sesión inválida",
      notes: "Retorno nulo para sesión inexistente"
    }
  }, async () => {
    const resp = await http().get("api/auth/get-session", {
      headers: {
        cookie: "better-auth.session_token=garbage-not-a-real-token",
      },
      throwHttpErrors: false,
    });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { user?: unknown } | null;
    expect(body?.user ?? null).toBeNull();
  });

  it("sign-in page is reachable with a valid cookie (no redirect loop)", {
    meta: {
      id: "PIA-014",
      endpoint: "GET /sign-in",
      objective: "Verificar que la página de inicio de sesión sea accesible con una cookie válida sin provocar bucles de redirección",
      expectedStatus: "Doscientos o trescientos siete",
      params: "Encabezado de cookie de sesión activa",
      notes: "Compatibilidad de la sesión activa con la página de acceso"
    }
  }, async () => {
    const resp = await ky.get(`${BASE_URL}/sign-in`, {
      headers: { cookie: session.cookie },
      throwHttpErrors: false,
    });
    expect([200, 307]).toContain(resp.status);
  });

  it("the signed-in user has userStatus=ACTIVE in the database", {
    meta: {
      id: "PIA-015",
      endpoint: "GET api/auth/get-session",
      objective: "Confirmar en la base de datos que el usuario autenticado posee el estado activo según el contrato establecido",
      expectedStatus: "Estado activo en base de datos",
      notes: "Validación de estado del registro de usuario"
    }
  }, async () => {
    const user = await prismadb.users.findUnique({
      where: { email: EMAIL },
      select: { id: true, userStatus: true },
    });
    expect(user, `user ${EMAIL} must exist after signInAsAdmin`).not.toBeNull();
    expect(user?.userStatus, "userStatus must be ACTIVE per seed contract").toBe("ACTIVE");
  });
});
