import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimited } from "@/middleware/with-rate-limit";

async function handleGET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  try {
    console.log("Running service route for Updating PRISMADB");
    //Clear this line and add your code here
    return NextResponse.json("Running service route for Updating PRISMADB");
  } catch (error) {
    console.log("[USERACTIVATE_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

// Apply rate limiting to all endpoints
export const GET = rateLimited(handleGET);
