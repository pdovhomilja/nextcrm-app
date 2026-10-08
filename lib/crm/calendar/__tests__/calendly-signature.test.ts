import { createHmac } from "crypto";
import { verifyCalendlySignature } from "../calendly-signature";

const KEY = "test-signing-key";
const T = "1721400000";

function sign(body: string, t = T, key = KEY) {
  const v1 = createHmac("sha256", key).update(`${t}.${body}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

beforeEach(() => jest.useFakeTimers().setSystemTime(new Date(Number(T) * 1000)));
afterEach(() => jest.useRealTimers());

describe("verifyCalendlySignature", () => {
  it("accepts a fixed known-good vector", () => {
    // HMAC-SHA256("test-signing-key", `1721400000.${body}`), computed
    // independently (Python hmac) — Calendly-Webhook-Signature: t=…,v1=<hex>.
    const body = '{"event":"invitee.created"}';
    const header =
      "t=1721400000,v1=017f86f67d36c8e779516dd2632cd1b8631360820e07666ca3a72f1311811b95";
    expect(verifyCalendlySignature(body, header, KEY)).toBe(true);
  });

  it("accepts a valid signature", () => {
    const body = JSON.stringify({ event: "invitee.created" });
    expect(verifyCalendlySignature(body, sign(body), KEY)).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifyCalendlySignature('{"a":2}', sign('{"a":1}'), KEY)).toBe(false);
  });

  it("rejects a wrong key", () => {
    const body = "{}";
    expect(verifyCalendlySignature(body, sign(body, T, "other"), KEY)).toBe(false);
  });

  it("rejects missing or malformed headers", () => {
    expect(verifyCalendlySignature("{}", null, KEY)).toBe(false);
    expect(verifyCalendlySignature("{}", "garbage", KEY)).toBe(false);
    expect(verifyCalendlySignature("{}", "t=123", KEY)).toBe(false);
    expect(verifyCalendlySignature("{}", sign("{}", "abc"), KEY)).toBe(false);
  });

  it("accepts a timestamp within 3 minutes and rejects an older one", () => {
    const body = "{}";
    const within = String(Number(T) - 170);
    const stale = String(Number(T) - 190);
    expect(verifyCalendlySignature(body, sign(body, within), KEY)).toBe(true);
    expect(verifyCalendlySignature(body, sign(body, stale), KEY)).toBe(false);
  });
});
