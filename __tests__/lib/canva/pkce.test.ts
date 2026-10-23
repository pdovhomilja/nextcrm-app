import { codeChallengeS256, createCodeVerifier } from "@/lib/canva/pkce";

describe("canva pkce", () => {
  it("creates a url-safe verifier", () => {
    const verifier = createCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("is deterministic for the same verifier", () => {
    expect(codeChallengeS256("abc")).toBe(codeChallengeS256("abc"));
    expect(codeChallengeS256("abc")).not.toBe(codeChallengeS256("abd"));
  });
});
