import {
  isValidGitRepositoryUrl,
  normalizeGitRepositoryUrl,
  parseGitRepositoryUrl,
} from "@/lib/ventures/git-repo";

describe("git-repo", () => {
  it("accepts GitHub HTTPS URLs", () => {
    expect(isValidGitRepositoryUrl("https://github.com/jayandra06/next-crm-app")).toBe(true);
    expect(normalizeGitRepositoryUrl("https://github.com/org/repo.git/")).toBe(
      "https://github.com/org/repo",
    );
  });

  it("normalizes git@ SSH URLs to HTTPS", () => {
    const raw = "git@github.com:ven-sai/rofyt.git";
    expect(isValidGitRepositoryUrl(raw)).toBe(true);
    expect(normalizeGitRepositoryUrl(raw)).toBe("https://github.com/ven-sai/rofyt");
  });

  it("rejects invalid hosts", () => {
    expect(isValidGitRepositoryUrl("https://evil.com/foo/bar")).toBe(false);
    expect(parseGitRepositoryUrl("not-a-url").ok).toBe(false);
  });
});
