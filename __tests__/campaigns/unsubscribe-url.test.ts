import { buildUnsubscribeUrl } from "@/lib/campaigns/unsubscribe-url";

describe("buildUnsubscribeUrl", () => {
  const original = process.env.NEXT_PUBLIC_APP_URL;
  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = original;
  });

  it("uses NEXT_PUBLIC_APP_URL as the base", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://crm.example.com";
    expect(buildUnsubscribeUrl("token-abc")).toBe(
      "https://crm.example.com/api/campaigns/unsubscribe?token=token-abc"
    );
  });

  it("strips a trailing slash from the base URL", () => {
    expect(buildUnsubscribeUrl("t1", "https://crm.example.com/")).toBe(
      "https://crm.example.com/api/campaigns/unsubscribe?token=t1"
    );
  });

  it("never renders the literal 'undefined' in the link", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://crm.example.com";
    expect(buildUnsubscribeUrl("t2")).not.toContain("undefined");
  });
});
