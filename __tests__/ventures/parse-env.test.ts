import { readEnvVarFromContent } from "@/lib/ventures/parse-env";

describe("parse-env", () => {
  it("reads provisioning secret from dotenv text", () => {
    const content = `
# comment
VENTURE_PROVISIONING_SECRET=abc123
DATABASE_URL=postgres://x
`;
    expect(readEnvVarFromContent(content, "VENTURE_PROVISIONING_SECRET")).toBe("abc123");
  });
});
