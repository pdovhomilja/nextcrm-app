import { createHmac, timingSafeEqual } from "crypto";

// Calendly signs webhooks with: Calendly-Webhook-Signature: t=<unix>,v1=<hex>
// where v1 = HMAC-SHA256(signingKey, `${t}.${rawBody}`).
export function verifyCalendlySignature(
  rawBody: string,
  header: string | null,
  signingKey: string
): boolean {
  if (!header || !signingKey) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.trim().split("=", 2) as [string, string])
  );
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;

  const expected = createHmac("sha256", signingKey)
    .update(`${t}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(v1, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
