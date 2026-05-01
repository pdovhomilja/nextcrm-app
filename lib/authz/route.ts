import { NextResponse } from "next/server";

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbiddenResponse(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function notFoundOrForbiddenResponse(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
