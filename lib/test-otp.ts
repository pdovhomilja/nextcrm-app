// OTP capture for e2e tests (better-auth testUtils + /api/auth/test-otp).
// Dev-only, and only with an explicit opt-in: NEXTCRM_E2E_TEST_OTP=1.
export function isTestOtpEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.NEXTCRM_E2E_TEST_OTP === "1";
}
