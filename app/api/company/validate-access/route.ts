import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { validateCompanyAccess } from "@/lib/security/company-access-validator";
import { z } from "zod/v3";

// Request validation schema
const ValidateAccessSchema = z.object({
  companyId: z.string().min(1, "Company ID is required"),
  resourceType: z.enum(["task", "board", "document", "ai_query"]),
  resourceId: z.string().optional(),
  action: z.string().default("read"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedRequest = ValidateAccessSchema.parse(body);

    const validation = await validateCompanyAccess(
      session.user.id,
      validatedRequest.companyId,
      validatedRequest.resourceType,
      validatedRequest.resourceId,
      validatedRequest.action,
    );

    if (!validation.isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || "Access denied",
          authorized: false,
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      authorized: true,
      message: "Access granted",
    });
  } catch (error) {
    console.error("Company access validation API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request format",
          details: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const companyId = url.searchParams.get("companyId");
    const resourceType = url.searchParams.get("resourceType") as
      | "task"
      | "board"
      | "document"
      | "ai_query";
    const resourceId = url.searchParams.get("resourceId");
    const action = url.searchParams.get("action") || "read";

    if (!companyId || !resourceType) {
      return NextResponse.json(
        {
          success: false,
          error: "companyId and resourceType are required",
        },
        { status: 400 },
      );
    }

    const validation = await validateCompanyAccess(
      session.user.id,
      companyId,
      resourceType,
      resourceId || undefined,
      action,
    );

    return NextResponse.json({
      success: true,
      authorized: validation.isAuthorized,
      error: validation.error || null,
    });
  } catch (error) {
    console.error("Company access validation GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
