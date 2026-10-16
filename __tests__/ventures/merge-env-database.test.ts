import { mergeDatabaseUrlIntoEnv } from "@/lib/ventures/merge-env-database";

describe("mergeDatabaseUrlIntoEnv", () => {
  it("adds MONGODB_URI when missing", () => {
    const out = mergeDatabaseUrlIntoEnv("VENTURE_PROVISIONING_SECRET=x", "mongodb+srv://a/b");
    expect(out).toContain("MONGODB_URI=mongodb+srv://a/b");
  });

  it("replaces existing DATABASE_URL", () => {
    const out = mergeDatabaseUrlIntoEnv("DATABASE_URL=old\nFOO=1", "mongodb+srv://new");
    expect(out).toContain("MONGODB_URI=mongodb+srv://new");
    expect(out).not.toContain("old");
  });
});
