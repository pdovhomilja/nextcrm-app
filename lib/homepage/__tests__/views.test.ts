jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Target_Homepage: { update: jest.fn() } },
}));

import { prismadb } from "@/lib/prisma";
import {
  isRealBrowserView,
  recordHomepageView,
  hasCrmSessionCookie,
} from "@/lib/homepage/views";

const update = prismadb.crm_Target_Homepage.update as jest.Mock;

describe("isRealBrowserView", () => {
  const CHROME =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const SAFARI_IOS =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

  it.each([CHROME, SAFARI_IOS])("accepts a real browser UA", (ua) => {
    expect(isRealBrowserView(ua)).toBe(true);
  });

  it.each([
    ["googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
    ["facebook unfurl", "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"],
    ["bing preview", "Mozilla/5.0 (Windows NT 6.1; WOW64) BingPreview/1.0b"],
    ["curl", "curl/8.1.2"],
    ["python", "python-requests/2.31.0"],
    ["slackbot", "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)"],
    ["empty", ""],
  ])("rejects a non-human UA (%s)", (_label, ua) => {
    expect(isRealBrowserView(ua)).toBe(false);
  });

  it("rejects null/undefined", () => {
    expect(isRealBrowserView(null)).toBe(false);
    expect(isRealBrowserView(undefined)).toBe(false);
  });
});

describe("recordHomepageView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    update.mockResolvedValue({});
  });

  it("increments the counter for a real browser view", () => {
    recordHomepageView("acme-co", "Mozilla/5.0 Chrome/120 Safari/537.36");
    expect(update).toHaveBeenCalledWith({
      where: { slug: "acme-co" },
      data: { view_count: { increment: 1 }, last_viewed_at: expect.any(Date) },
    });
  });

  it("does NOT count a bot/prefetch view", () => {
    recordHomepageView("acme-co", "Googlebot/2.1");
    expect(update).not.toHaveBeenCalled();
  });

  it("never throws even if the DB write rejects (fire-and-forget)", () => {
    update.mockRejectedValue(new Error("db down"));
    expect(() =>
      recordHomepageView("acme-co", "Mozilla/5.0 Chrome/120 Safari/537.36")
    ).not.toThrow();
  });

  const BROWSER = "Mozilla/5.0 Chrome/120 Safari/537.36";

  it("does NOT count an operator view carrying a CRM session cookie", () => {
    recordHomepageView("acme-co", BROWSER, "better-auth.session_token=abc123; other=1");
    expect(update).not.toHaveBeenCalled();
  });

  it("counts a prospect view with unrelated cookies but no session", () => {
    recordHomepageView("acme-co", BROWSER, "_ga=GA1.2.3; theme=dark");
    expect(update).toHaveBeenCalledTimes(1);
  });
});

describe("hasCrmSessionCookie", () => {
  it.each([
    ["plain", "better-auth.session_token=abc.def"],
    ["secure prefix", "__Secure-better-auth.session_token=abc.def; x=1"],
    ["host prefix", "a=1; __Host-better-auth.session_token=abc.def"],
    ["mid-header", "foo=bar; better-auth.session_token=tok; baz=qux"],
  ])("detects the session cookie (%s)", (_l, header) => {
    expect(hasCrmSessionCookie(header)).toBe(true);
  });

  it.each([
    ["null", null],
    ["empty", ""],
    ["no session cookie", "_ga=GA1.2.3; theme=dark"],
    ["empty value", "better-auth.session_token=; x=1"],
    ["similar-but-different name", "my-better-auth.session_token_x=abc"],
  ])("returns false when absent (%s)", (_l, header) => {
    expect(hasCrmSessionCookie(header as string | null)).toBe(false);
  });
});
