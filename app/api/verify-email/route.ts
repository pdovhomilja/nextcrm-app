import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/email-verification";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/auth/signin?error=missing-token", request.url));
  }

  const result = await verifyEmailToken(token);

  if (!result.success) {
    return NextResponse.redirect(new URL("/auth/signin?error=invalid-token", request.url));
  }

  // Redirect to sign-in page with success message
  return NextResponse.redirect(new URL("/auth/signin?verified=true", request.url));
}