import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { AgentEnrichmentStrategy } from "@/lib/enrichment/strategies/agent-enrichment-strategy";
import type { EnrichmentField } from "@/lib/enrichment/types";
import type { StoredEnrichmentResult } from "@/lib/enrichment/types/stored-result";
import { validateEnrichRequest } from "./validate";
import { getApiKey } from "@/lib/api-keys";

export const runtime = "nodejs";

const activeSessions = new Map<string, { controller: AbortController; enrichmentId: string }>();

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const firecrawlApiKey = await getApiKey("FIRECRAWL", session.user.id);
  const openaiApiKey = await getApiKey("OPENAI", session.user.id);
  if (!firecrawlApiKey || !openaiApiKey) {
    return NextResponse.json({ error: "NO_API_KEY" }, { status: 402 });
  }

  const body = await request.json();
  const { targetId, fields } = body as { targetId: string; fields: EnrichmentField[] };
  const validationError = validateEnrichRequest({ targetId, fields });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const target = await prismadb.crm_Targets.findUnique({
    where: { id: targetId },
    select: { id: true, email: true, company: true, company_website: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }
  if (!target.email && !target.company) {
    return NextResponse.json(
      { error: "Target needs at least an email or company name to enrich." },
      { status: 422 }
    );
  }

  const enrichmentRecord = await prismadb.crm_Target_Enrichment.create({
    data: {
      targetId,
      status: "RUNNING",
      fields: fields.map((f) => f.name),
      triggeredBy: session.user.id,
    },
  });

  const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const abortController = new AbortController();
  activeSessions.set(sessionId, { controller: abortController, enrichmentId: enrichmentRecord.id });

  request.signal.addEventListener("abort", () => {
    abortController.abort();
  });

  const encoder = new TextEncoder();
  const strategy = new AgentEnrichmentStrategy(openaiApiKey, firecrawlApiKey);

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        enqueue({ type: "session", sessionId });

        const result = await strategy.enrichRow(
          { email: target.email ?? '' },
          fields,
          "email",
          undefined,
          (message: string, type: string, sourceUrl?: string) => {
            enqueue({ type: "agent_progress", message, messageType: type, sourceUrl });
          },
          {
            companyName: target.company ?? undefined,
            companyWebsite: target.company_website ?? undefined,
          }
        );

        const stored: StoredEnrichmentResult = {
          enrichments: result.enrichments,
          status: result.status as "completed" | "error" | "skipped",
          error: result.error,
        };

        await prismadb.crm_Target_Enrichment.update({
          where: { id: enrichmentRecord.id },
          data: { status: "COMPLETED", result: stored as object },
        });

        enqueue({ type: "result", result: stored, enrichmentId: enrichmentRecord.id });
        enqueue({ type: "complete" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        await prismadb.crm_Target_Enrichment.update({
          where: { id: enrichmentRecord.id },
          data: { status: "FAILED", error: message },
        }).catch(() => {});
        enqueue({ type: "error", error: message });
      } finally {
        activeSessions.delete(sessionId);
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function DELETE(request: NextRequest) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const entry = activeSessions.get(sessionId);
  if (!entry) {
    return NextResponse.json({ error: "Session not found or already complete" }, { status: 404 });
  }

  entry.controller.abort();
  activeSessions.delete(sessionId);

  await prismadb.crm_Target_Enrichment.update({
    where: { id: entry.enrichmentId },
    data: { status: "FAILED", error: "Cancelled by user" },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
