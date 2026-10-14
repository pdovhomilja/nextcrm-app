"use server";

import { issueSignInOtp } from "@/lib/auth-otp-issue";

export async function sendSignInOtp(email: string) {
  return issueSignInOtp(email);
}
