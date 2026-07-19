import { createHmac } from "crypto";
import { verifyCalendlySignature } from "../calendly-signature";

const KEY = "test-signing-key";

function sign(body: string, t = "1721400000", key = KEY) {
  const v1 = createHmac("sha256", key).update(`${t}.${body}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

describe("verifyCalendlySignature", () => {
  it("accepts a valid signature", () => {
    const body = JSON.stringify({ event: "invitee.created" });
    expect(verifyCalendlySignature(body, sign(body), KEY)).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifyCalendlySignature('{"a":2}', sign('{"a":1}'), KEY)).toBe(false);
  });

  it("rejects a wrong key", () => {
    const body = "{}";
    expect(verifyCalendlySignature(body, sign(body, "1721400000", "other"), KEY)).toBe(false);
  });

  it("rejects missing or malformed headers", () => {
    expect(verifyCalendlySignature("{}", null, KEY)).toBe(false);
    expect(verifyCalendlySignature("{}", "garbage", KEY)).toBe(false);
    expect(verifyCalendlySignature("{}", "t=123", KEY)).toBe(false);
  });
});
