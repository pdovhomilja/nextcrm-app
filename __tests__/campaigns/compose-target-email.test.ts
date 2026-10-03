import {
  buildTargetMergeSource,
  withVersionParam,
} from "@/lib/campaigns/compose-target-email";

const target = {
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.com",
  company: "Analytical Engines",
  position: "CEO",
};

describe("withVersionParam", () => {
  it("appends ?v=<versionId> to a plain URL", () => {
    expect(withVersionParam("https://x.test/p/abc", "v1")).toBe(
      "https://x.test/p/abc?v=v1"
    );
  });

  it("appends with & when the URL already has a query string", () => {
    expect(withVersionParam("https://x.test/p/abc?foo=1", "v1")).toBe(
      "https://x.test/p/abc?foo=1&v=v1"
    );
  });

  it("returns the URL unchanged when there is no version id", () => {
    expect(withVersionParam("https://x.test/p/abc", null)).toBe(
      "https://x.test/p/abc"
    );
    expect(withVersionParam("https://x.test/p/abc", "")).toBe(
      "https://x.test/p/abc"
    );
  });

  it("returns an empty string unchanged", () => {
    expect(withVersionParam("", "v1")).toBe("");
  });
});

describe("buildTargetMergeSource homepage cache-busting", () => {
  it("version-stamps the homepage url and screenshot when READY (so a reverted version is a fresh, uncacheable URL)", () => {
    const src = buildTargetMergeSource(target, {
      status: "READY",
      preview_url: "https://previews.test/p/acme",
      screenshot_url: "https://previews.test/p/acme/screenshot.png",
      current_version_id: "ver-123",
    });
    expect(src.homepage_url).toBe("https://previews.test/p/acme?v=ver-123");
    expect(src.homepage_screenshot).toBe(
      "https://previews.test/p/acme/screenshot.png?v=ver-123"
    );
  });

  it("blanks homepage fields when the homepage is not READY (e.g. mid-revert)", () => {
    const src = buildTargetMergeSource(target, {
      status: "RUNNING",
      preview_url: "https://previews.test/p/acme",
      screenshot_url: "https://previews.test/p/acme/screenshot.png",
      current_version_id: "ver-123",
    });
    expect(src.homepage_url).toBe("");
    expect(src.homepage_screenshot).toBe("");
  });

  it("falls back to the un-stamped URL when READY but no current_version_id is present", () => {
    const src = buildTargetMergeSource(target, {
      status: "READY",
      preview_url: "https://previews.test/p/acme",
      screenshot_url: "https://previews.test/p/acme/screenshot.png",
      current_version_id: null,
    });
    expect(src.homepage_url).toBe("https://previews.test/p/acme");
    expect(src.homepage_screenshot).toBe(
      "https://previews.test/p/acme/screenshot.png"
    );
  });

  it("blanks homepage fields when there is no homepage", () => {
    const src = buildTargetMergeSource(target, null);
    expect(src.homepage_url).toBe("");
    expect(src.homepage_screenshot).toBe("");
  });
});
