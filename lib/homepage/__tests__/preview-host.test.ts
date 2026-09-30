import { isPreviewHostAllowed, isPreviewsBaseMalformed } from "@/lib/homepage/preview-host";

const BASE = "https://previews.radeengineering.com";

describe("isPreviewHostAllowed", () => {
  it("allows everything when no previews base is configured (local dev)", () => {
    expect(isPreviewHostAllowed("crm.radeengineering.com", undefined)).toBe(true);
    expect(isPreviewHostAllowed("anything", "")).toBe(true);
  });

  it("allows the exact previews host (and ignores a :443 / port suffix)", () => {
    expect(isPreviewHostAllowed("previews.radeengineering.com", BASE)).toBe(true);
    expect(isPreviewHostAllowed("previews.radeengineering.com:443", BASE)).toBe(true);
  });

  it("404s the previews path on any other host (incl. the CRM host)", () => {
    expect(isPreviewHostAllowed("crm.radeengineering.com", BASE)).toBe(false);
    expect(isPreviewHostAllowed("evil.com", BASE)).toBe(false);
    expect(isPreviewHostAllowed(null, BASE)).toBe(false);
    expect(isPreviewHostAllowed("", BASE)).toBe(false);
  });

  it("does NOT allow a look-alike host via startsWith (localhost.evil.com)", () => {
    expect(isPreviewHostAllowed("localhost.evil.com", BASE)).toBe(false);
    expect(isPreviewHostAllowed("previews.radeengineering.com.evil.com", BASE)).toBe(false);
  });

  it("allows loopback hosts for local dev even when a base is set", () => {
    expect(isPreviewHostAllowed("localhost:3000", BASE)).toBe(true);
    expect(isPreviewHostAllowed("127.0.0.1", BASE)).toBe(true);
    expect(isPreviewHostAllowed("[::1]:3000", BASE)).toBe(true);
  });

  it("fails OPEN (allows) when the base is malformed, so previews never hard-break", () => {
    expect(isPreviewHostAllowed("crm.radeengineering.com", "not a url")).toBe(true);
  });
});

describe("isPreviewsBaseMalformed", () => {
  it("is false when unset or a valid URL, true when unparseable", () => {
    expect(isPreviewsBaseMalformed(undefined)).toBe(false);
    expect(isPreviewsBaseMalformed(BASE)).toBe(false);
    expect(isPreviewsBaseMalformed("not a url")).toBe(true);
  });
});
