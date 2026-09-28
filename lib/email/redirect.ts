/**
 * Non-prod email safety guard.
 *
 * When `EMAIL_REDIRECT_TO` is set, every outbound recipient is rewritten to that
 * single test inbox — so dev/QA can exercise real Resend sends without emailing real
 * people. This matters because QA shares the production sending domains: a bounce or
 * spam complaint from a QA test send hurts the **same** domain reputation production
 * relies on.
 *
 * Set `EMAIL_REDIRECT_TO` in the **Development** and **Preview (QA)** Vercel scopes
 * only, and leave it **unset in Production**. As a fail-safe it ALSO never redirects a
 * production deploy (`VERCEL_ENV === "production"`), so a stray value can't silently
 * divert real customer mail.
 *
 * Applied centrally: `lib/resend.ts` wraps every transactional send, and the campaign
 * sender (`inngest/functions/campaigns/send-step.ts`) wraps its recipient.
 */
export function redirectRecipients(to: string | string[]): string | string[] {
  const override = process.env.EMAIL_REDIRECT_TO;
  if (!override || process.env.VERCEL_ENV === "production") {
    return to;
  }
  return Array.isArray(to) ? [override] : override;
}
