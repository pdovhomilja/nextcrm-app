import { NextRequest, NextResponse } from "next/server";
import { auth, isTestOrDev } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

// Test-only endpoint to retrieve captured OTPs for E2E testing.
// Only available in non-production environments.
//
// Two lookup strategies, tried in order:
// 1. Better Auth's testUtils plugin (in-memory capture).
// 2. Fallback: read the most recent verification row for the email from
//    the database. This is needed when running against a `next start`
//    server where NODE_ENV=production disables the testUtils plugin
//    but the suite still needs the OTP to drive the flow.
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production" && !isTestOrDev) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  // NOTE: We always read from the database here. Better Auth's testUtils
  // plugin keeps an in-memory store that is global to the server process,
  // which causes stale OTPs to be returned when the suite issues multiple
  // signInAs calls in a single run. The DB is the only source of truth
  // we can scope per-request by truncating via the test helper.
  void auth;

  // 2. Fallback: read from the verification table.
  // Better Auth prefixes the identifier with the OTP purpose
  // (e.g. "sign-in-otp-{email}"). Match any of those prefixes so this
  // helper works regardless of the type the suite is exercising.

  const otpPrefixes = [
    "sign-in-otp-",
    "email-verification-otp-",
    "forget-password-otp-",
    "phone-verification-otp-",
  ];

  for (const prefix of otpPrefixes) {
    const row = await prismadb.verification.findFirst({
      where: { identifier: `${prefix}${email}` },
      orderBy: { createdAt: "desc" },
      select: { value: true, expiresAt: true },
    });

    if (!row) continue;
    if (row.expiresAt.getTime() <= Date.now()) continue;

    // Better Auth stores the value as "{otp}:{attempts}". Strip attempts.
    const otp = row.value.split(":")[0];
    return NextResponse.json({ otp });
  }

  return NextResponse.json({ error: "No OTP found" }, { status: 404 });
}
