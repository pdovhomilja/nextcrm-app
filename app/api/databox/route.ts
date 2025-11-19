import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/middleware/with-rate-limit";

async function handleGET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ message: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[DATABOX_HEALTH]", error);
    return NextResponse.json({ message: "error" }, { status: 500 });
  }
}

// Apply rate limiting to all endpoints
export const GET = rateLimited(handleGET);
