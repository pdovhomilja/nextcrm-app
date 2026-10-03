import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destination = new URL("/en/admin/linkedin", url.origin);
  if (url.searchParams.has("error")) destination.searchParams.set("connected", "error");
  else destination.searchParams.set("connected", "1");
  return NextResponse.redirect(destination);
}
