# Critical Security Vulnerability: Multi-Tenancy Data Leak in Embeddings System

## 1. Executive Summary

A critical security vulnerability has been identified in our AI embeddings system. The current implementation lacks multi-tenancy enforcement, allowing for a potential data leak where users from one company could inadvertently access or receive information related to tasks and boards from another company. This document provides a comprehensive analysis of the vulnerability and a detailed, step-by-step remediation plan for our development team.

The root cause is the absence of `companyId` filtering across the entire embedding lifecycle, from data extraction for embedding generation to the retrieval of similar items from the vector database.

The proposed solution involves systematically introducing and enforcing `companyId` checks at every layer of the embeddings architecture: the data extraction service, the embedding storage service, the API endpoints, and the vector search service. This will ensure strict data isolation between tenants.

## 2. Vulnerability Analysis

The vulnerability stems from the system's failure to isolate data based on the user's company affiliation. An authenticated user can currently craft API requests to generate embeddings or search for related items using `taskId` or `boardId`s from _any_ company within the system.

**Impact:**

- **High Severity:** This constitutes a critical data breach.
- **Confidentiality Breach:** Sensitive project and task information could be exposed to unauthorized parties.
- **Reputation Damage:** Such a leak would severely damage user trust and our company's reputation.

## 3. Root Cause Analysis

The lack of tenant isolation is present in the following key areas:

1.  **Data Extraction (`lib/ai/data-extraction.ts`):** The `extractTaskData` and `extractBoardData` functions fetch records from the database using only the `id` of the task or board. They do not validate that the requested resource belongs to the `companyId` of the user initiating the request.
2.  **Embedding Generation API (`app/api/ai/embeddings/route.ts`):** The `POST` handler for actions like `process_tasks` and `process_single_task` accepts a list of `taskIds` without verifying that these tasks belong to the authenticated user's company.
3.  **Vector Search (`lib/ai/vector-search.ts`):** The `findSimilarTasks` and `findSimilarBoards` functions perform vector similarity searches on the entire dataset. The raw SQL queries are missing a `WHERE` clause to filter the search results by `companyId`.
4.  **AI Agent (`lib/ai/specialized-agents.ts`):** The `SpecializedAgent` consumes the insecure vector search functions, meaning its contextual understanding and suggestions could be contaminated with data from other tenants.

## 4. Affected Components

The following files and components are directly involved and require modification:

- `lib/ai/data-extraction.ts`
- `lib/ai/embedding-storage.ts`
- `app/api/ai/embeddings/route.ts`
- `lib/ai/vector-search.ts`
- `lib/ai/specialized-agents.ts`

## 5. Remediation Plan

The following steps must be executed in order to patch the vulnerability.

### Step 1: Secure the Data Extraction Layer

**File:** `lib/ai/data-extraction.ts`

**Objective:** Ensure that data extraction functions can only access data for a specified company.

1.  **Update `extractTaskData` function signature:**
    - Add a `companyId: string` parameter.
    - Change the Prisma query from `db.task.findUnique` to `db.task.findFirst`.
    - Add a `where` clause to filter by both `id: taskId` and `boardSection: { board: { companyId } }`.

2.  **Update `extractBoardData` function signature:**
    - Add a `companyId: string` parameter.
    - Change the Prisma query from `db.board.findUnique` to `db.board.findFirst`.
    - Add a `where` clause to filter by both `id: boardId` and `companyId`.

3.  **Update callers within the file:**
    - The `extractCompanyTaskData` and `extractCompanyBoardData` methods must now pass the `companyId` to the updated functions.

### Step 2: Propagate `companyId` through the Embedding Storage Service

**File:** `lib/ai/embedding-storage.ts`

**Objective:** Pass the `companyId` from higher-level services down to the data extraction layer.

1.  **Update `processTaskEmbedding` and `processBoardEmbedding`:**
    - Add a `companyId: string` parameter to both function signatures.
    - Pass this `companyId` down to the `dataExtractionService.extractTaskData` and `dataExtractionService.extractBoardData` calls.
    - Update error logging to reflect potential access-denied issues (e.g., "Task not found or access denied").

2.  **Update `batchProcessTaskEmbeddings` and `batchProcessBoardEmbeddings`:**
    - Add a `companyId: string` parameter to both function signatures.
    - Pass the `companyId` when calling the single-processing methods (`processTaskEmbedding`, `processBoardEmbedding`) within the batching loop.

3.  **Update `processCompanyEmbeddings`:**
    - Ensure it passes the `companyId` to the batch processing functions.

### Step 3: Enforce Authorization at the API Layer

**File:** `app/api/ai/embeddings/route.ts`

**Objective:** Use the authenticated user's session to authorize embedding operations.

1.  **Retrieve `companyId` from session:** In the `POST` handler, get the `companyId` from the `session.user.cid`.
2.  **Update `process_tasks` and `process_single_task` cases:**
    - Pass the `companyId` from the session to `embeddingStorageService.batchProcessTaskEmbeddings` and `embeddingStorageService.processTaskEmbedding`.
3.  **Update `process_boards` case:**
    - Pass the `companyId` from the session to `embeddingStorageService.batchProcessBoardEmbeddings`.

### Step 4: Secure the Vector Search Service

**File:** `lib/ai/vector-search.ts`

**Objective:** Filter all similarity searches to the user's company.

1.  **Update `findSimilarTasks` function:**
    - Add a `companyId: string` parameter to the function signature.
    - Modify the raw SQL query to include a `WHERE` clause: `WHERE metadata->>'companyId' = ${companyId}`.

2.  **Update `findSimilarBoards` function:**
    - Add a `companyId: string` parameter to the function signature.
    - Modify the raw SQL query to include a `WHERE` clause: `WHERE metadata->>'companyId' = ${companyId}`.

### Step 5: Secure the AI Agent Context

**File:** `lib/ai/specialized-agents.ts`

**Objective:** Ensure the AI agent operates only on data from the correct tenant.

1.  **Update `getTaskContext` and `getBoardContext` methods:**
    - When calling `vectorSearchService.findSimilarTasks` and `vectorSearchService.findSimilarBoards`, pass `this.companyId`.

## 6. Validation and Testing

After implementing the changes, perform the following checks:

1.  **Unit Tests:** Create unit tests for the data extraction and vector search functions to assert that they correctly filter by `companyId`.
2.  **Integration Tests:**
    - Create two users in two different companies with distinct tasks.
    - As User A, make an API call to the `/api/ai/embeddings` endpoint to process a task belonging to User B. The request should fail or result in a "not found or access denied" error.
    - As User A, trigger a similarity search. The results should _only_ contain tasks/boards from User A's company.
3.  **Code Review:** A senior engineer must review all changes to confirm the `companyId` is correctly passed and enforced at all layers.
