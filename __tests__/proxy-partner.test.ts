/**
 * proxy.ts refuses a partner every route outside lib/partner-routes.ts, on the
 * server (partner-role spec, ticket 4). Pages redirect to his dashboard, API
 * routes answer 403. Other roles are not affected.
 */
import { NextRequest } from "next/server";

const mockGetSession = jest.fn();
jest.mock("@/lib/auth", () => ({ auth: { api: { getSession: mockGetSession } } }));
// ESM-only packages: stand-ins with the same contract (cookie read, pass-through).
jest.mock("better-auth/cookies", () => ({
  getSessionCookie: (r: NextRequest) => r.cookies.get("better-auth.session_token")?.value ?? null,
}));
jest.mock("next-intl/middleware", () => () => () => jest.requireActual("next/server").NextResponse.next());

import { proxy } from "../proxy";

function req(path: string, method = "GET") {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method,
    headers: { cookie: "better-auth.session_token=tok" },
  });
}
const as = (role: string) => mockGetSession.mockResolvedValue({ user: { id: "u1", role } });

beforeEach(() => mockGetSession.mockReset());

describe("proxy: partner route allow-list", () => {
  it.each(["/en/admin", "/en/campaigns", "/en/projects", "/en/some-new-module", "/cz/invoices/abc"])(
    "redirects a partner away from page %s to his dashboard",
    async (path) => {
      as("partner");
      const res = await proxy(req(path));
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/");
    }
  );

  it.each(["/api/admin/invoices/series", "/api/upload/presigned-url", "/api/reports/export", "/api/crm/contacts/x"])(
    "answers 403 to a partner on API %s",
    async (path) => {
      as("partner");
      const res = await proxy(req(path, "POST"));
      expect(res.status).toBe(403);
    }
  );

  it("lets a partner open an allowed page without a session lookup", async () => {
    const res = await proxy(req("/en/crm/accounts/abc"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.status).toBe(200);
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it.each(["admin", "manager", "user"])("does not refuse %s on /en/admin", async (role) => {
    as(role);
    const res = await proxy(req("/en/admin"));
    expect(res.status).toBe(200);
  });

  it("does not look up a session for a request without a session cookie", async () => {
    const res = await proxy(
      new NextRequest(new URL("http://localhost:3000/api/crm/leads/create-lead-from-web"), { method: "POST" })
    );
    expect(mockGetSession).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});
