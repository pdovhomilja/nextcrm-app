jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: { calendarConnection: { upsert: jest.fn() } },
}));
jest.mock("@/lib/email-crypto", () => ({ encrypt: (v: string) => `enc(${v})` }));

const getToken = jest.fn();
const setCredentials = jest.fn();
const calendarListGet = jest.fn();
jest.mock("googleapis", () => ({
  google: { calendar: () => ({ calendarList: { get: calendarListGet } }) },
}));
jest.mock("@/lib/crm/calendar/google", () => {
  const actual = jest.requireActual("@/lib/crm/calendar/google");
  return {
    ...actual,
    getGoogleOAuthClient: () => ({ getToken, setCredentials }),
  };
});

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { GET } from "../route";

const session = getSession as jest.Mock;
const upsert = prismadb.calendarConnection.upsert as jest.Mock;

const READONLY = "https://www.googleapis.com/auth/calendar.readonly";
const EVENTS = "https://www.googleapis.com/auth/calendar.events";
const STATE = "s1";

function makeReq() {
  const req = new NextRequest(
    `http://localhost/api/profile/calendar-connections/google/callback?code=c1&state=${STATE}`
  );
  req.cookies.set("gcal_oauth_state", STATE);
  return req;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost";
  session.mockResolvedValue({ user: { id: "user1" } });
  calendarListGet.mockResolvedValue({ data: { id: "rep@aqunama.com" } });
  upsert.mockResolvedValue({});
});

describe("GET google calendar OAuth callback", () => {
  // INVARIANT: the stored scopeLevel always describes the stored refresh
  // token. The update branch replaces refreshTokenEncrypted unconditionally,
  // so it must replace scopeLevel unconditionally too. A row left claiming
  // "readwrite" while holding a readonly token makes outbound sync 403 with
  // insufficientPermissions — not a per-event error, so the whole connection
  // gets deactivated and inbound sync dies with it.
  it("stores readonly on the update branch when a readwrite connection is re-authed with a readonly grant", async () => {
    getToken.mockResolvedValue({
      tokens: { refresh_token: "rt-readonly", access_token: "at", scope: READONLY },
    });

    await GET(makeReq());

    const args = upsert.mock.calls[0][0];
    expect(args.update.scopeLevel).toBe("readonly");
    expect(args.update.refreshTokenEncrypted).toBe("enc(rt-readonly)");
    expect(args.create.scopeLevel).toBe("readonly");
  });

  it("stores readwrite when calendar.events was granted", async () => {
    getToken.mockResolvedValue({
      tokens: { refresh_token: "rt-rw", access_token: "at", scope: `${READONLY} ${EVENTS}` },
    });

    await GET(makeReq());

    const args = upsert.mock.calls[0][0];
    expect(args.update.scopeLevel).toBe("readwrite");
    expect(args.update.refreshTokenEncrypted).toBe("enc(rt-rw)");
    expect(args.create.scopeLevel).toBe("readwrite");
  });

  it("redirects with no-refresh-token and writes nothing when Google returns no refresh token", async () => {
    getToken.mockResolvedValue({ tokens: { access_token: "at", scope: READONLY } });
    const res = await GET(makeReq());
    expect(res.headers.get("location")).toContain("calendar=no-refresh-token");
    expect(upsert).not.toHaveBeenCalled();
  });
});
