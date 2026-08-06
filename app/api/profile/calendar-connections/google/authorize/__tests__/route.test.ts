jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/crm/calendar/google", () => ({
  getGoogleAuthUrl: jest.fn((state: string, level: string) => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}&level=${level}`),
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { MAX_PENDING_STATES } from "@/lib/crm/calendar/oauth-state";
import { GET } from "../route";

const session = getSession as jest.Mock;

function authorizeReq(existingCookie?: string) {
  const req = new NextRequest(
    "http://localhost/api/profile/calendar-connections/google/authorize?level=readwrite"
  );
  if (existingCookie) req.cookies.set("gcal_oauth_state", existingCookie);
  return req;
}

function cookieStates(res: { cookies: { get(name: string): { value: string } | undefined } }): string[] {
  const value = res.cookies.get("gcal_oauth_state")?.value;
  return value ? (JSON.parse(value) as string[]) : [];
}

beforeEach(() => {
  jest.clearAllMocks();
  session.mockResolvedValue({ user: { id: "user1" } });
});

describe("GET google calendar OAuth authorize", () => {
  it("requires a session", async () => {
    session.mockResolvedValue(null);
    const res = await GET(authorizeReq());
    expect(res.status).toBe(401);
  });

  it("writes the state as a JSON array in the cookie", async () => {
    const res = await GET(authorizeReq());
    const states = cookieStates(res);
    expect(states).toHaveLength(1);
    expect(states[0]).toMatch(/^[0-9a-f]{32}$/);
    expect(res.headers.get("location")).toContain(`state=${states[0]}`);
  });

  it("appends to an existing cookie instead of overwriting (concurrent tabs)", async () => {
    const first = await GET(authorizeReq());
    const statesAfterFirst = cookieStates(first);

    const second = await GET(authorizeReq(JSON.stringify(statesAfterFirst)));
    const statesAfterSecond = cookieStates(second);

    expect(statesAfterSecond).toHaveLength(2);
    expect(statesAfterSecond[0]).toBe(statesAfterFirst[0]);
  });

  it("caps the pending list, dropping the oldest states", async () => {
    const existing = Array.from({ length: MAX_PENDING_STATES }, (_, i) => `old${i}`);
    const res = await GET(authorizeReq(JSON.stringify(existing)));
    const states = cookieStates(res);
    expect(states).toHaveLength(MAX_PENDING_STATES);
    // Oldest entry was evicted, the newest (the fresh state) is last.
    expect(states[0]).toBe("old1");
  });
});
