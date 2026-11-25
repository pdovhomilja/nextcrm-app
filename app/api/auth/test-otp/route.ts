import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isTestOtpEnabled } from "@/lib/test-otp";

// Test-only endpoint to retrieve captured OTPs for E2E testing
// Only available outside production with NEXTCRM_E2E_TEST_OTP=1
export async function GET(request: NextRequest) {
  if (!isTestOtpEnabled()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  try {
    const ctx = await auth.$context;
    const otp = (ctx as any).test?.getOTP(email);
    if (otp) {
      return NextResponse.json({ otp });
    }
    return NextResponse.json({ error: "No OTP found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "testUtils not enabled" }, { status: 500 });
  }
}
