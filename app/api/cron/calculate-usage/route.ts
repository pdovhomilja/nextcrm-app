import { NextRequest, NextResponse } from "next/server";
import { runCalculateUsageJob } from "@/lib/cron/calculate-usage-job";

/**
 * Cron job endpoint for calculating usage for all organizations
 *
 * Can be triggered by:
 * - GitHub Actions (scheduled workflow)
 * - External cron service (e.g., EasyCron, Setcron)
 * - Internal scheduler
 *
 * Security: In production, validate the request is from a trusted source
 * (e.g., check Authorization header or CRON_SECRET env variable)
 */
export async function POST(request: NextRequest) {
  // Security: Validate the request origin/secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("Authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse(
      JSON.stringify({
        error: "Unauthorized",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await runCalculateUsageJob();

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[CRON_ENDPOINT]", error);

    return NextResponse.json(
      {
        success: false,
        timestamp: new Date(),
        message: `Error running cron job: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      status: "healthy",
      timestamp: new Date(),
      message: "Usage calculation cron job endpoint is active",
    },
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
