/**
 * proxy.ts refuses cookie-authenticated writes to /api/* unless the Origin
 * header is the app's own origin (BETTER_AUTH_URL). A page on a same-site
 * host (files.<domain>) can send the session cookie, but not this Origin.
 * Token-authenticated calls and the exempt routes are not touched.
 */
import { NextRequest } from "next/server";

const mockGetSession = jest.fn();
jest.mock("@/lib/auth", () => ({ auth: { api: { getSession: mockGetSession } } }));
jest.mock("better-auth/cookies", () => ({
  getSessionCookie: (r: NextRequest) => r.cookies.get("better-auth.session_token")?.value ?? null,
}));
jest.mock("next-intl/middleware", () => () => () => jest.requireActual("next/server").NextResponse.next());

import { proxy } from "../proxy";

const APP = "http://localhost:3000"; // BETTER_AUTH_URL in the CI env
const FILES = "http://files.localhost:3000";

function req(path: string, method: string, headers: Record<string, string>) {
  return new NextRequest(new URL(path, APP), { method, headers });
}
const cookie = { cookie: "better-auth.session_token=tok" };

beforeEach(() => mockGetSession.mockReset().mockResolvedValue({ user: { id: "u1", role: "admin" } }));

describe("proxy: Origin check on cookie-authenticated /api writes", () => {
  it.each([
    ["POST", "/api/upload/presigned-url"],
    ["PATCH", "/api/crm/contacts/abc"],
    ["DELETE", "/api/profile/calendar-connections/abc"],
    ["POST", "/api/admin/invoices/tax-rates"],
    ["PUT", "/api/crm/targets/abc"],
  ])("refuses %s %s from a foreign origin", async (method, path) => {
    const res = await proxy(req(path, method, { ...cookie, origin: FILES }));
    expect(res.status).toBe(403);
  });

  it("refuses a cookie-authenticated write without an Origin header", async () => {
    const res = await proxy(req("/api/crm/contacts/abc", "PATCH", cookie));
    expect(res.status).toBe(403);
  });

  it.each([
    ["POST", "/api/upload/presigned-url"],
    ["DELETE", "/api/admin/invoices/series/abc"],
  ])("lets %s %s from the app origin through", async (method, path) => {
    const res = await proxy(req(path, method, { ...cookie, origin: APP }));
    expect(res.status).toBe(200);
  });

  it.each(["GET", "HEAD", "OPTIONS"])("does not check %s", async (method) => {
    const res = await proxy(req("/api/reports/export", method, { ...cookie, origin: FILES }));
    expect(res.status).toBe(200);
  });

  it("refuses a foreign-origin write that carries the session cookie and an Authorization header", async () => {
    const res = await proxy(
      req("/api/crm/contacts/abc", "PATCH", { ...cookie, authorization: "Bearer x", origin: FILES })
    );
    expect(res.status).toBe(403);
  });

  it("does not touch a bearer-token write without a session cookie", async () => {
    const res = await proxy(
      req("/api/crm/contacts/abc", "PATCH", { authorization: "Bearer nc_x", origin: FILES })
    );
    expect(res.status).toBe(200);
  });

  it("does not touch a write without a session cookie (the route authenticates it)", async () => {
    const res = await proxy(req("/api/crm/contacts/abc", "PATCH", { origin: FILES }));
    expect(res.status).toBe(200);
  });

  it.each([
    "/api/auth/sign-in/email-otp",
    "/api/inngest",
    "/api/mcp/mcp",
    "/api/campaigns/webhooks/resend",
    "/api/crm/calendar/webhooks/calendly",
    "/api/campaigns/unsubscribe",
    "/api/crm/leads/create-lead-from-web",
    "/api/crm/contacts/create-from-remote",
  ])("exempts %s", async (path) => {
    const res = await proxy(req(path, "POST", { ...cookie, origin: FILES }));
    expect(res.status).toBe(200);
  });
});
