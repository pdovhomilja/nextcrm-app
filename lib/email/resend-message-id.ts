/** CRM stores Resend receiving ids as `resend-inbound-{id}` in Email.rfcMessageId. */
export function resendReceivingIdFromRfc(rfcMessageId: string): string | null {
  const prefix = "resend-inbound-";
  if (!rfcMessageId.startsWith(prefix)) return null;
  const id = rfcMessageId.slice(prefix.length).trim();
  return id.length > 0 ? id : null;
}
