import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { aiSecurity } from "@/lib/security/ai-security";
import { z } from "zod/v3";

const privacyActionSchema = z.object({
  action: z.enum(["anonymize", "delete", "export"]),
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { action, userId } = privacyActionSchema.parse(body);

    // Determine target user - admin can target other users, regular users can only target themselves
    const targetUserId = userId || session.user.id;
    // Temporarily commented out role check for build
    // const isAdmin = session.user.role === 'ADMIN';

    if (targetUserId !== session.user.id) {
      return NextResponse.json(
        { error: "Can only manage your own data" },
        { status: 403 },
      );
    }

    switch (action) {
      case "anonymize":
        await aiSecurity.anonymizeUserData(targetUserId);
        return NextResponse.json({
          success: true,
          message: "User AI data anonymized successfully",
        });

      case "delete":
        await aiSecurity.deleteUserAIData(targetUserId);
        return NextResponse.json({
          success: true,
          message: "User AI data deleted successfully",
        });

      case "export":
        // This would implement data export functionality
        return NextResponse.json({
          success: false,
          message: "Data export not yet implemented",
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Privacy API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Privacy action failed" },
      { status: 500 },
    );
  }
}

export async function GET(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _request: NextRequest,
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // const { searchParams } = new URL(request.url);
    // const _timeRange =
    //   (searchParams.get("timeRange") as "hour" | "day" | "week") || "day";

    // Get security metrics (admin only) - temporarily commented out for build
    // if (session.user.role === 'ADMIN') {
    //   const securityMetrics = await aiSecurity.getSecurityMetrics(timeRange);
    //   return NextResponse.json({
    //     securityMetrics,
    //     timeRange,
    //     timestamp: new Date().toISOString(),
    //   });
    // }

    return NextResponse.json({
      message: "Privacy settings and data management",
      availableActions: ["anonymize", "delete", "export"],
      userRights: [
        "Right to access your AI conversation data",
        "Right to anonymize your AI conversation history",
        "Right to delete your AI data (GDPR compliance)",
        "Right to export your AI data",
      ],
    });
  } catch (error) {
    console.error("Privacy info error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve privacy information" },
      { status: 500 },
    );
  }
}
