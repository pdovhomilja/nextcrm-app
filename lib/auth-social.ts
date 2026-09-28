import type { BetterAuthOptions } from "better-auth";

/**
 * Build the better-auth `socialProviders` config from a Google client id/secret.
 *
 * Google sign-in is registered **only when both** are set. Passing either as
 * undefined cleanly disables the "Sign in with Google" button (no broken provider,
 * no placeholder creds needed) — email-OTP login is unaffected. Pure (no env reads)
 * so it's unit-testable in isolation; `lib/auth.ts` supplies the env values.
 */
export function socialProvidersConfig(
  clientId: string | undefined,
  clientSecret: string | undefined
): NonNullable<BetterAuthOptions["socialProviders"]> {
  if (clientId && clientSecret) {
    return { google: { clientId, clientSecret } };
  }
  return {};
}
