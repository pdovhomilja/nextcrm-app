import { envSecret } from "@/lib/env-secret";

const NAME = "ENV_SECRET_TEST_KEY";

afterEach(() => {
  delete process.env[NAME];
});

describe("envSecret", () => {
  it("returns undefined when unset or empty", () => {
    expect(envSecret(NAME)).toBeUndefined();
    process.env[NAME] = "";
    expect(envSecret(NAME)).toBeUndefined();
    process.env[NAME] = "   ";
    expect(envSecret(NAME)).toBeUndefined();
  });

  it.each([
    "sk-placeholder-replace-to-enable-ai",
    "re_placeholder_replace_to_enable_email",
    "your-openai-api-key",
    "your_key_here",
  ])("treats placeholder %s as unset", (value) => {
    process.env[NAME] = value;
    expect(envSecret(NAME)).toBeUndefined();
  });

  it("returns real values trimmed", () => {
    process.env[NAME] = " sk-abc123 ";
    expect(envSecret(NAME)).toBe("sk-abc123");
  });
});
