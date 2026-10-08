import { z } from "zod";
jest.mock("@/lib/email-crypto", () => ({ encrypt: (s: string) => `enc:${s}`, decrypt: (s: string) => s.replace(/^enc:/, "") }));
import { decryptSecrets, describeSettingsSchema, encryptSecrets, parseStoredSettings } from "@/lib/plugins/settings";

const schema = z.object({
  days: z.number().int().min(1).default(90),
  mode: z.enum(["direct", "intermediary"]).default("direct"),
  url: z.string(),
  note: z.string().optional(),
  autoConfirm: z.boolean().default(false),
});

it("describes flat schemas for form generation", () => {
  expect(describeSettingsSchema(schema)).toEqual([
    { key: "days", kind: "number", required: false, defaultValue: 90 },
    { key: "mode", kind: "enum", required: false, defaultValue: "direct", options: ["direct", "intermediary"] },
    { key: "url", kind: "string", required: true },
    { key: "note", kind: "string", required: false },
    { key: "autoConfirm", kind: "boolean", required: false, defaultValue: false },
  ]);
});

it("refuses nested or unsupported field types", () => {
  expect(() => describeSettingsSchema(z.object({ list: z.array(z.string()) }))).toThrow("Unsupported settings field type: array (list)");
});

it("falls back to defaults per invalid field and warns (Review Focus 1)", () => {
  const warn = jest.fn();
  const parsed = parseStoredSettings(schema, { days: "ninety", mode: "direct", url: "https://x", legacy: 1 }, warn);
  expect(parsed).toEqual({ days: 90, mode: "direct", url: "https://x", autoConfirm: false });
  expect(warn).toHaveBeenCalledWith("Stored settings invalid; using defaults for: days", expect.anything());
});

it("keeps a required field without default as undefined instead of crashing", () => {
  const parsed = parseStoredSettings(schema, {}, jest.fn());
  expect(parsed.url).toBeUndefined();
  expect(parsed.days).toBe(90);
});

it("encrypts and decrypts secrets as JSON", () => {
  const c = encryptSecrets({ apiKey: "k" });
  expect(c).toBe('enc:{"apiKey":"k"}');
  expect(decryptSecrets(c)).toEqual({ apiKey: "k" });
  expect(encryptSecrets({})).toBeNull();
  expect(decryptSecrets(null)).toEqual({});
});

it("treats undecryptable secrets as not set and reports it instead of throwing (I1)", () => {
  const onError = jest.fn();
  expect(decryptSecrets("garbage", onError)).toEqual({});
  expect(onError).toHaveBeenCalledTimes(1);
  expect(decryptSecrets("garbage")).toEqual({});
});
