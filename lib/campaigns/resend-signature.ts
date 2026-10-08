import { Webhook } from "svix";

// Resend signs webhooks with Svix: `svix-id`, `svix-timestamp` and
// `svix-signature` headers, secret `whsec_…` (RESEND_WEBHOOK_SECRET).
// `Webhook.verify` checks the signature and rejects timestamps more than
// 5 minutes off.
export function verifyResendSignature(body: string, headers: Headers): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return false;
  try {
    new Webhook(secret).verify(body, {
      "svix-id": headers.get("svix-id") ?? "",
      "svix-timestamp": headers.get("svix-timestamp") ?? "",
      "svix-signature": headers.get("svix-signature") ?? "",
    });
    return true;
  } catch {
    return false;
  }
}
