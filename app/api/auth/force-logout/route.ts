import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reason = searchParams.get("reason");
  
  // Log security event
  console.error("SECURITY: Forced logout executed", {
    reason,
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get("user-agent"),
  });

  // Clear all session cookies
  const cookieStore = await cookies();
  
  // Delete Next-Auth session cookies
  cookieStore.delete("next-auth.session-token");
  cookieStore.delete("__Secure-next-auth.session-token");
  cookieStore.delete("next-auth.csrf-token");
  cookieStore.delete("__Host-next-auth.csrf-token");
  
  // Also delete possible JWT token cookies
  cookieStore.delete("next-auth.callback-url");
  cookieStore.delete("__Secure-next-auth.callback-url");

  // Redirect to sign in
  return NextResponse.redirect(new URL("/auth/signin", request.url));
}