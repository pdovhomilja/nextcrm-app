# Phase 7: Post-Migration Issue Analysis - AI Assistant Data Leak

This document analyzes the critical security vulnerability identified in the AI Assistant v2 feature following the multi-tenancy migration. The feature is currently leaking data between tenants, allowing users from one company to see tasks and boards belonging to another.

## 1. Executive Summary

The root cause of the data leak is the failure to integrate the new multi-tenancy architecture into the AI subsystem's data access layer. The AI agents and their underlying data-fetching mechanisms are still operating under the old single-tenant model, completely bypassing the mandatory `companyId` scoping for database queries.

This document breaks down the issue into two parts: a critical backend flaw that causes the data leak, and a related frontend misalignment with the new session and URL structure.

## 2. Backend Analysis (Root Cause)

The core of the problem lies within the `lib/ai/` directory and the API routes that serve the AI assistant, primarily `/api/ai/chat-v2`. The entire data retrieval pipeline for the AI is not tenant-aware.

### 2.1. Missing Tenancy Context Propagation

The data flow from an API request to a database query fails to carry and enforce the user's company context (`activeCompanyId`).

1.  **API Route (`/api/ai/chat-v2/route.ts`)**: The route handler is the first point of failure. While it likely authenticates the user, it does not appear to extract the `activeCompanyId` from the user's session.
2.  **Agent Orchestrator (`agent-orchestrator.ts` or similar)**: The API route invokes the AI agent system but fails to pass the `activeCompanyId` as a critical parameter to the agent's execution context.
3.  **Specialized Agents & Tools (`specialized-agents.ts`)**: The agents define various tools (e.g., `getInformation`) that the AI can use to fetch data. These tool definitions do not accept a `companyId` parameter, making it impossible for them to perform tenant-scoped operations.

### 2.2. Unscoped Data Access Layer

Because the tenancy context is never passed down, the data access layer retrieves information from the entire database, without filtering by the user's company.

1.  **Vector Search (`vector-search.ts`)**: Any functions performing similarity searches on task or board embeddings are likely not including a `companyId` filter in their metadata filtering clauses (e.g., in Pinecone or pgvector). The search is executed across all vectors, regardless of tenant.
2.  **Direct Database Queries (`rag-processor.ts`, etc.)**: Any direct Prisma or raw SQL queries used by the AI tools to fetch task/board details are missing the crucial `WHERE` clause to filter by `companyId`. For instance, a query to get a task should look like this, but currently does not:

    ```typescript
    // CORRECT, TENANT-AWARE QUERY
    db.task.findFirst({
      where: {
        id: taskId,
        boardSection: {
          board: {
            companyId: activeCompanyId, // This is missing
          },
        },
      },
    });
    ```

### 2.3. Recommended Backend Remediation Plan

1.  **Modify API Route**: Update `/api/ai/chat-v2/route.ts` to retrieve the `activeCompanyId` from the `auth()` session object.
2.  **Update Agent Context**: Pass the `activeCompanyId` to the agent orchestrator and include it in the execution context for the entire AI operation.
3.  **Refactor AI Tools**: All AI tool definitions that access data (e.g., `getInformation`) must be refactored to accept `companyId` as a mandatory parameter.
4.  **Enforce Scoping in Data Access**:
    - Update all Prisma queries within the `lib/ai/` directory to use the `companyId` in their `where` clauses.
    - Update all vector search calls to include a metadata filter for `companyId`.
    - If using raw SQL, ensure the `companyId` is safely parameterized in every query.

## 3. Frontend Analysis (Related Issue)

While not the root cause of the leak, the AI Assistant v2 frontend is not correctly aligned with the new multi-tenancy UI/UX patterns.

### 3.1. Use of Deprecated `cid`

The component at `app/(app)/[cid]/ai-assistant-v2/page.tsx` constructs links to tasks and boards using `session?.user?.cid`.

```typescript
// Incorrect usage in page.tsx
href={`/${session?.user?.cid}/tasks/${message.boardId}`}
```

As per the implementation plan, the `cid` field on the `User` model is deprecated. The URL should be constructed using the `activeCompanyId` from the session, which is managed by the `CompanyProvider`. The current URL parameter `[cid]` should be used instead.

### 3.2. Recommended Frontend Remediation Plan

1.  **Adopt `CompanyProvider`**: Ensure the `useCompany()` hook or a similar mechanism is used to get the `activeCompanyId`.
2.  **Update Link Generation**: Refactor the link generation logic to use the correct, active company ID from the context or page parameters, not the deprecated `cid` from the user object. A simple way is to use the `params` from the page component.

    ```typescript
    // app/(app)/[cid]/...
    //
    // function Page({ params }: { params: { cid: string } }) {
    //  ...
    //  href={`/${params.cid}/tasks/${message.boardId}`}
    // }
    ```

By addressing the backend flaws, the data leak will be sealed. By correcting the frontend, the user experience will align with the new, robust multi-tenant architecture.
