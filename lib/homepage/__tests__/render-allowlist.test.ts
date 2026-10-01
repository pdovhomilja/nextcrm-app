import { isAllowedRenderRequest, GSAP_VERSION } from "@/lib/homepage/render-allowlist";

it("allows Google Fonts", () => {
  expect(isAllowedRenderRequest("https://fonts.googleapis.com/css2?family=Inter")).toBe(true);
  expect(isAllowedRenderRequest("https://fonts.gstatic.com/s/inter/x.woff2")).toBe(true);
});

it("allows the pinned GSAP path on cdnjs", () => {
  expect(
    isAllowedRenderRequest(`https://cdnjs.cloudflare.com/ajax/libs/gsap/${GSAP_VERSION}/gsap.min.js`),
  ).toBe(true);
  expect(
    isAllowedRenderRequest(
      `https://cdnjs.cloudflare.com/ajax/libs/gsap/${GSAP_VERSION}/ScrollTrigger.min.js`,
    ),
  ).toBe(true);
});

it("REJECTS internal/metadata/other + wrong cdnjs path + look-alike host", () => {
  for (const u of [
    "http://169.254.169.254/latest/meta-data/",
    "http://localhost/x",
    "http://127.0.0.1/x",
    "https://evil.com/x",
    "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.0/jquery.min.js",
    `https://cdnjs.cloudflare.com/ajax/libs/gsap/9.9.9/gsap.min.js`,
    "https://fonts.googleapis.com.evil.com/x",
    "not a url",
  ]) {
    expect(isAllowedRenderRequest(u)).toBe(false);
  }
});

it("rejects host-confusion tricks (userinfo, suffix, path traversal out of the gsap prefix)", () => {
  for (const u of [
    "https://fonts.googleapis.com@evil.com/x",
    "https://evil.com/fonts.googleapis.com",
    "https://evilfonts.googleapis.com/x",
    "https://cdnjs.cloudflare.com.evil.com/ajax/libs/gsap/3.13.0/gsap.min.js",
    `https://cdnjs.cloudflare.com/ajax/libs/gsap/${GSAP_VERSION}/../../jquery/3.7.0/jquery.min.js`,
  ]) {
    expect(isAllowedRenderRequest(u)).toBe(false);
  }
});

describe("per-slug image path allowance (previews host)", () => {
  const opts = { previewsHost: "previews.example.com", imagePathPrefix: "/p/acme/images/" };

  it("allows fonts + gsap unchanged, with opts", () => {
    expect(isAllowedRenderRequest("https://fonts.googleapis.com/css2", opts)).toBe(true);
    expect(
      isAllowedRenderRequest(
        `https://cdnjs.cloudflare.com/ajax/libs/gsap/${GSAP_VERSION}/gsap.min.js`,
        opts,
      ),
    ).toBe(true);
  });

  it("allows this slug's image path on the previews host", () => {
    expect(isAllowedRenderRequest("https://previews.example.com/p/acme/images/img-1.png", opts)).toBe(
      true,
    );
  });

  it("blocks another slug's path, other hosts, and non-image paths on the previews host", () => {
    expect(isAllowedRenderRequest("https://previews.example.com/p/other/images/x.png", opts)).toBe(false);
    expect(isAllowedRenderRequest("https://evil.com/p/acme/images/x.png", opts)).toBe(false);
    expect(isAllowedRenderRequest("https://previews.example.com/p/acme/index.html", opts)).toBe(false);
  });

  it("blocks host-confusion and traversal tricks against the previews host", () => {
    for (const u of [
      "https://previews.example.com.evil.com/p/acme/images/x.png",
      "https://evilpreviews.example.com/p/acme/images/x.png",
      "https://previews.example.com@evil.com/p/acme/images/x.png",
      "https://previews.example.com/p/acme/images/../../other/images/x.png",
      "https://previews.example.com/p/acme/images/%2e%2e/%2e%2e/other/images/x.png",
    ]) {
      expect(isAllowedRenderRequest(u, opts)).toBe(false);
    }
  });

  it("matches the host case-insensitively", () => {
    expect(
      isAllowedRenderRequest("https://PREVIEWS.Example.com/p/acme/images/a.png", {
        previewsHost: "Previews.Example.COM",
        imagePathPrefix: "/p/acme/images/",
      }),
    ).toBe(true);
  });

  it("requires BOTH previewsHost and imagePathPrefix", () => {
    const url = "https://previews.example.com/p/acme/images/img-1.png";
    expect(isAllowedRenderRequest(url, { previewsHost: "previews.example.com" })).toBe(false);
    expect(isAllowedRenderRequest(url, { imagePathPrefix: "/p/acme/images/" })).toBe(false);
    expect(isAllowedRenderRequest(url, {})).toBe(false);
  });

  it("without opts, the previews host is blocked (back-compat)", () => {
    expect(isAllowedRenderRequest("https://previews.example.com/p/acme/images/img-1.png")).toBe(false);
  });
});
