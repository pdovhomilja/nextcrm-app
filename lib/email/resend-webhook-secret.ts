/** Resend signs inbound webhooks with the secret from the webhook details page (whsec_…). */
export function getResendInboundWebhookSecret(): string | undefined {
  return (
    process.env.RESEND_INBOUND_WEBHOOK_SECRET?.trim() ||
    process.env.RESEND_WEBHOOK_SECRET?.trim()
  );
}
