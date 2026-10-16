import {
  envContentFromEntries,
  normalizeEnvEntriesForEditor,
  parseEnvContent,
  readEnvVarFromContent,
  serializeEnvContent,
} from "@/lib/ventures/parse-env";

describe("parse-env", () => {
  it("reads provisioning secret from dotenv text", () => {
    const content = `
# comment
VENTURE_PROVISIONING_SECRET=abc123
DATABASE_URL=postgres://x
`;
    expect(readEnvVarFromContent(content, "VENTURE_PROVISIONING_SECRET")).toBe("abc123");
  });

  it("splits and re-serializes env entries", () => {
    const raw = "VENTURE_PROVISIONING_SECRET=secret\nMONGODB_URI=mongodb+srv://x";
    const { entries } = parseEnvContent(raw);
    expect(entries).toHaveLength(2);
    const back = serializeEnvContent([], entries);
    expect(back).toContain("VENTURE_PROVISIONING_SECRET=secret");
    expect(back).toContain("MONGODB_URI=mongodb+srv://x");
  });

  it("normalizes editor rows with preferred keys first", () => {
    const rows = normalizeEnvEntriesForEditor("FOO=bar\nVENTURE_PROVISIONING_SECRET=z");
    expect(rows[0]?.key).toBe("VENTURE_PROVISIONING_SECRET");
    expect(rows.find((r) => r.key === "FOO")?.value).toBe("bar");
  });

  it("round-trips through envContentFromEntries", () => {
    const initial = "# note\nVENTURE_PROVISIONING_SECRET=abc";
    const rows = normalizeEnvEntriesForEditor(initial);
    const out = envContentFromEntries(initial, rows);
    expect(out).toContain("VENTURE_PROVISIONING_SECRET=abc");
  });
});
