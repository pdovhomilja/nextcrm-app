import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { documentProcessor } from "@/lib/ai/document-processor";
import { withAISecurity } from "@/lib/security/ai-security";
import { z } from "zod";

const uploadSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  companyId: z.string(),
  taskId: z.string().optional(),
  boardId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  return withAISecurity(request, "document-processing", async () => {
    try {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      const formData = await request.formData();
      const file = formData.get("file") as File;
      const metadataJson = formData.get("metadata") as string;

      if (!file || !metadataJson) {
        return NextResponse.json(
          { error: "File and metadata are required" },
          { status: 400 }
        );
      }

      // Validate metadata
      const metadata = uploadSchema.parse(JSON.parse(metadataJson));

      // Verify company access
      if (session.user.cid !== metadata.companyId) {
        return NextResponse.json(
          { error: "Access denied to this company" },
          { status: 403 }
        );
      }

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Process document
      const result = await documentProcessor.processDocument(buffer, {
        ...metadata,
        uploadedBy: session.user.id,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: "Document processing failed" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          documentId: result.documentId,
          summary: result.summary,
          keyInsights: result.keyInsights,
          confidence: result.confidence,
          processingTime: result.processingTime,
        },
      });
    } catch (error) {
      console.error("Document upload error:", error);

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid metadata", details: error.issues },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Document processing failed" },
        { status: 500 }
      );
    }
  });
}

export async function GET(request: NextRequest) {
  return withAISecurity(request, "ai-analysis", async () => {
    try {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      const { searchParams } = new URL(request.url);
      const action = searchParams.get("action");
      const companyId = session.user.cid;

      if (!companyId) {
        return NextResponse.json(
          { error: "Company context required" },
          { status: 400 }
        );
      }

      switch (action) {
        case "search": {
          const query = searchParams.get("query");
          const boardId = searchParams.get("boardId") || undefined;
          const taskId = searchParams.get("taskId") || undefined;
          const limit = parseInt(searchParams.get("limit") || "5");

          if (!query) {
            return NextResponse.json(
              { error: "Query parameter required" },
              { status: 400 }
            );
          }

          const results = await documentProcessor.searchDocuments(
            query,
            companyId,
            { boardId, taskId, limit }
          );

          return NextResponse.json({ results });
        }

        case "stats": {
          const stats = await documentProcessor.getProcessingStats(companyId);
          return NextResponse.json({ stats });
        }

        default:
          return NextResponse.json(
            { error: "Invalid action" },
            { status: 400 }
          );
      }
    } catch (error) {
      console.error("Document API error:", error);
      return NextResponse.json({ error: "Request failed" }, { status: 500 });
    }
  });
}
