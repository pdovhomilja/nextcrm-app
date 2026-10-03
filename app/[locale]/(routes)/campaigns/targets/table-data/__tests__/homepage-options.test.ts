import {
  targetHomepagePresence,
  targetHomepageUrl,
  homepagePresenceLabel,
} from "../homepage-options";

const PREVIEW = "https://previews.radeengineering.com/p/acme";

describe("targetHomepagePresence", () => {
  it("is NONE when there is no homepage row", () => {
    expect(targetHomepagePresence(null)).toBe("NONE");
    expect(targetHomepagePresence(undefined)).toBe("NONE");
  });

  it("is NONE when the row exists but has no published version", () => {
    expect(
      targetHomepagePresence({ status: "PENDING", current_version_id: null }),
    ).toBe("NONE");
  });

  it("is YES once a published version exists, regardless of job status", () => {
    // A later RUNNING/FAILED refine still leaves the published page available.
    expect(
      targetHomepagePresence({ status: "READY", current_version_id: "v1" }),
    ).toBe("YES");
    expect(
      targetHomepagePresence({ status: "RUNNING", current_version_id: "v1" }),
    ).toBe("YES");
  });

  it("is NONE when the homepage row is soft-deleted", () => {
    expect(
      targetHomepagePresence({
        status: "READY",
        current_version_id: "v1",
        deletedAt: new Date(),
      }),
    ).toBe("NONE");
  });
});

describe("targetHomepageUrl", () => {
  it("returns the preview URL for a published page", () => {
    expect(
      targetHomepageUrl({ current_version_id: "v1", preview_url: PREVIEW }),
    ).toBe(PREVIEW);
  });

  it("returns null when there is no published page", () => {
    expect(targetHomepageUrl(null)).toBeNull();
    expect(
      targetHomepageUrl({ current_version_id: null, preview_url: PREVIEW }),
    ).toBeNull();
  });

  it("returns null for a soft-deleted page", () => {
    expect(
      targetHomepageUrl({
        current_version_id: "v1",
        preview_url: PREVIEW,
        deletedAt: new Date(),
      }),
    ).toBeNull();
  });

  it("refuses a non-http(s) preview URL (no click-to-XSS)", () => {
    expect(
      targetHomepageUrl({
        current_version_id: "v1",
        preview_url: "javascript:alert(1)",
      }),
    ).toBeNull();
    expect(
      targetHomepageUrl({ current_version_id: "v1", preview_url: "" }),
    ).toBeNull();
  });
});

describe("homepagePresenceLabel", () => {
  it("maps values to labels with a safe default", () => {
    expect(homepagePresenceLabel("YES")).toBe("Has homepage");
    expect(homepagePresenceLabel("NONE")).toBe("No homepage");
    expect(homepagePresenceLabel(undefined)).toBe("No homepage");
  });
});
