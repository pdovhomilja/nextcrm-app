## TaskHQ AI Assistant — Implementation Plan

Status: Draft (implementation-ready)

This plan operationalizes the AI Assistant end-to-end using the completed RAG phases (1–6) and adheres to `roadmap/implementation-rule.md`. It focuses on concrete deliverables, file-level edits, validation, testing, and rollout.

---

### 1) Scope and Objectives

- Integrate a production-capable AI assistant in `/(app)/[cid]/ai-assistant` that:
  - Streams RAG + Agent responses with source citations and confidence.
  - Offers smart suggestions and board insights.
  - Respects company isolation (`cid`), auth, rate limits, audit logging, and privacy.
  - Surfaces health/metrics and fails safe when dependencies degrade.

Out-of-scope: New ML models; non-OpenAI provider abstraction; full-blown E2E Cypress test harness (follow-up optional).

---

### 2) Guardrails (from implementation-rule.md)

- Database access must use `@/lib/db` only. Never instantiate new PrismaClient.
- All server actions and API routes validate session via `auth()` and filter by `cid`.
- Zod input validation for all external inputs; sanitize content; 4k char AI input cap.
- Feature flags: `AI_FEATURES_ENABLED`, `MCP_SSE_ENABLED`, `PGVECTOR_ENABLED` must gate functionality gracefully.
- Rate limit + audit log for AI endpoints. Respect role-based access.
- Use shadcn/ui patterns; responsive; loading and error boundaries.
- Build gates: `pnpm build` and `pnpm lint` must pass before marking complete.

---

### 3) Current State Summary (from phase1–6 resumes)

- Implemented:
  - Embeddings (Phase 2), vector search (Phase 3), context assembly, RAG processor, agents (Phase 4), APIs and UI components (Phase 5), advanced features (docs, memory, security, metrics) (Phase 6).
  - API routes exist: `/api/ai/chat`, `/api/ai/suggest`, `/api/ai/analyze`, `/api/ai/agents`, `/api/ai/agents/metrics`, `/api/ai/embeddings`, `/api/ai/documents`, `/api/ai/metrics`, `/api/ai/privacy`, health endpoints.
  - UI components exist: `components/ai/ai-assistant.tsx`, `components/ai/smart-suggestions.tsx`, `components/ai/project-insights.tsx`.
- Gaps to resolve:
  - Fix MCP tool Zod schema definitions in `/app/api/mcp/**/[transport]/route.ts`.
  - Ensure pgvector is enabled and Prisma state matches runtime DB.
  - Enforce security service (`lib/security/ai-security.ts`) consistently across AI routes.
  - Wire `/(app)/[cid]/ai-assistant/page.tsx` to existing AI components + streaming.

---

### 4) Backend Completion Tasks

4.1 MCP schema fixes (blocking build)

- Files:
  - `app/api/mcp/[transport]/route.ts`
  - `app/api/mcp/tasks/[transport]/route.ts`
  - `app/api/mcp/search/[transport]/route.ts`
  - `app/api/mcp/analytics/[transport]/route.ts`
  - `app/api/mcp/boards/[transport]/route.ts`
- Actions:
  - Normalize tool parameter schemas to MCP adapter expectations (Zod object shapes with exact parameter typing; no `any`).
  - Add explicit input parsing and detailed error responses.
  - Ensure auth + `cid` filtering before tool execution.

    4.2 Vector DB readiness

- Enable pgvector and ensure matching Prisma schema.
- Commands:
  - `psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;"`
  - `pnpm prisma generate && pnpm prisma db push`
- Validate: `/app/api/health/mcp` and `/api/ai/embeddings?action=health` return green; run a sample vector query.

  4.3 Security consistency

- Ensure these routes use `ai-security` guards (rate limits, audit, validation):
  - `app/api/ai/chat/route.ts`
  - `app/api/ai/suggest/route.ts`
  - `app/api/ai/analyze/route.ts`
  - `app/api/ai/documents/route.ts`
  - `app/api/ai/metrics/route.ts`
  - `app/api/ai/privacy/route.ts`
- Add role checks per “USER, CONTRIBUTOR, EDITOR, MEDIA, ADMIN” when sensitive.

  4.4 Monitoring and health

- Confirm metrics in `lib/monitoring/ai-metrics.ts` are emitted on each AI operation path.
- Ensure `/app/api/health/ai/route.ts` aggregates MCP, vector DB, OpenAI health.

---

### 5) RAG + Agent Service Validation

- `lib/ai/vector-search.ts`: Verify threshold defaults, filters, and performance. Add index notes in README if needed.
- `lib/ai/context-assembly.ts`: Confirm token budgeting and prompt template selection; tune defaults for TaskHQ queries.
- `lib/ai/rag-processor.ts`: Verify classification fallback and error handling; ensure streaming integration path aligns with `/api/ai/chat`.
- `lib/ai/agent-core.ts`, `lib/ai/agent-orchestrator.ts`, `lib/ai/specialized-agents.ts`: Ensure multi-agent selection logic and synthesis are guarded by feature flags and metrics.

---

### 6) API Interface Layer — Contract and Examples

Endpoints (must validate session and `cid`; Zod schema; rate-limit; audit):

- `POST /api/ai/chat`
  - Body: `{ messages: {role, content}[], boardId?: string, contextType?: string, multiAgent?: boolean }`
  - Returns: `{ stream?: ReadableStream, messages?: Message[], sources?: Source[], confidence?: number, stats?: {...} }`
- `GET /api/ai/chat?action=health|stats`
- `POST /api/ai/suggest` → suggestions for current board/user
- `POST /api/ai/analyze` → structured insights (optionally streaming)
- `POST /api/ai/embeddings` → process company embeddings; supports batch

Acceptance tests should assert 401 without session, 403 wrong `cid`, 429 when limits exceeded, and JSON error shape.

---

### 7) Frontend Integration (`/(app)/[cid]/ai-assistant`)

7.1 Page integration

- File: `app/(app)/[cid]/ai-assistant/page.tsx`
- Add existing AI components:
  - `AIAssistant` (floating chat) → binds to `/api/ai/chat`
  - `SmartSuggestions` → `/api/ai/suggest`
  - `ProjectInsights` → `/api/ai/analyze`

    7.2 Minimal wiring example

```tsx
// app/(app)/[cid]/ai-assistant/page.tsx (excerpt)
import { AIAssistant } from "@/components/ai/ai-assistant";
import { SmartSuggestions } from "@/components/ai/smart-suggestions";
import { ProjectInsights } from "@/components/ai/project-insights";

export default function AIAssistantPage() {
  return (
    <SidebarInset>
      <SiteHeader title="AI Assistant" />
      <div className="p-4 space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <ProjectInsights analysisType="comprehensive" />
          </div>
          <div>
            <SmartSuggestions suggestionType="general" autoRefresh />
          </div>
        </div>
        <AIAssistant initialMode="chat" />
      </div>
    </SidebarInset>
  );
}
```

7.3 UI and UX

- Use shadcn/ui, keep loading states and error boundaries.
- Gate UI features when `AI_FEATURES_ENABLED` is false; show helpful disabled state.
- Show sources and confidence in chat bubbles; provide “run action” buttons for suggestions.

---

### 8) Security, Privacy, and Compliance

- Verify email verification gating for AI features.
- Enforce `ai-security` rate limits per operation type; prefer Redis in prod.
- Sanitize and clamp user input length; refuse binary payloads in chat.
- Implement audit logging to `SecurityAuditLog` on sensitive operations.
- Respect RBAC on analytics/boards/tasks tools.

---

### 9) Testing Plan

Unit

- Vector search query building, thresholds, filters.
- Context assembly token budgeting and selection.
- RAG classification fallbacks.

Integration

- `/api/ai/chat`, `/api/ai/suggest`, `/api/ai/analyze` auth/`cid`/rate-limit.
- MCP health and tool invocation happy paths and failures.
- Document processing health and privacy endpoints.

E2E (lightweight manual acceptance or Playwright, optional)

- Happy path chat with streaming; sources and confidence visible.
- Suggestions render and “mark implemented” flows.
- Insights tab loads with health OK and degrades gracefully when health is red.

---

### 10) Migrations and Ops

- Prereqs:
  - `OPENAI_API_KEY`, `AI_MODEL`, `EMBEDDING_MODEL`, `AI_FEATURES_ENABLED=true`, `PGVECTOR_ENABLED=true`.
  - For MCP SSE: `MCP_SSE_ENABLED=true` and Redis URL configured (if used).
- DB:
  - Enable pgvector and push schema.
  - Run embedding processing once for baseline: `POST /api/ai/embeddings`.
- Health:
  - Verify `/api/health/ai` and `/api/health/mcp` are green in staging.

---

### 11) Rollout & Feature Flags

- Stage 1 (staging): AI features enabled for internal admins only.
- Stage 2 (limited beta): Enable for selected companies via flag in env or DB config.
- Stage 3 (GA): Enable globally; keep rate limits conservative; monitor metrics.

---

### 12) Risks and Mitigations

- MCP schema drift → Pin SDK versions; add unit tests for tool schemas.
- OpenAI outages → Graceful degradation to keyword search; user-facing banner.
- Cost spikes → Aggressive caching; per-company limits; visible metrics.
- Vector performance → Add indexes; tune threshold; fallback to hybrid when slow.

---

### 13) Definition of Done (acceptance)

- Build: `pnpm build` passes; `pnpm lint` passes (no new warnings).
- Health: `/api/health/ai` and `/api/health/mcp` all green.
- Security: All AI routes enforce auth, `cid`, Zod, rate limiting, audit logging.
- UX: Chat streams with sources and confidence; suggestions actionable; insights render.
- Tests: Integration tests green; manual acceptance scenarios pass.
- Docs: This plan committed; `.env.example` updated if needed.

---

### 14) Execution Checklist (granular)

- [ ] Fix MCP tool Zod schemas in all `/app/api/mcp/**/[transport]/route.ts` files
- [ ] Enable pgvector; run `prisma generate` and `db push`
- [ ] Enforce `ai-security` across AI APIs (chat, suggest, analyze, documents, metrics, privacy)
- [ ] Verify vector search and RAG paths under realistic data
- [ ] Wire `/(app)/[cid]/ai-assistant/page.tsx` to AI components
- [ ] Add confidence and source rendering to chat UI (if missing)
- [ ] Confirm email verification gating prior to AI usage
- [ ] Validate rate limits and audit logs in metrics
- [ ] Run integration tests (`tests/integration/ai-system.test.ts`)
- [ ] Final build and lint; document rollout toggle states

---

### 15) Quick Commands

```bash
# Prisma and DB readiness
pnpm prisma generate
pnpm prisma db push

# Build and lint gates
pnpm build
pnpm lint

# Health checks
curl -sS "/api/health/ai" | jq
curl -sS "/api/health/mcp" | jq

# Embeddings kickstart (company-wide)
curl -sS -X POST "/api/ai/embeddings" -H "Content-Type: application/json" -d '{"action":"process_company"}' | jq
```

---

This plan is implementation-ready. Execute the checklist top-to-bottom; keep build/lint green and health endpoints passing before enabling flags for users.
