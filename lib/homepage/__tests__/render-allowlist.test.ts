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
