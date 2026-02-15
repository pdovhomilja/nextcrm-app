# TaskHQ Architecture Documentation

This document provides a comprehensive overview of the TaskHQ codebase architecture, covering the technology stack, directory structure, component relationships, state management, routing, database schema, authentication flows, and AI/ML system architecture.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Directory Structure](#directory-structure)
3. [Routing & Multi-Tenancy](#routing--multi-tenancy)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [Database Schema](#database-schema)
7. [Authentication System](#authentication-system)
8. [AI/ML Architecture](#aiml-architecture)
9. [API Architecture](#api-architecture)

---

## Technology Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.4.4 | Full-stack React framework with App Router |
| React | 19.1.0 | UI library with Server Components |
| TypeScript | 5.0+ | Type-safe JavaScript |
| Node.js | 22 LTS | Runtime environment |
| pnpm | Latest | Package manager |

### Frontend
| Technology | Purpose |
|------------|---------|
| Tailwind CSS v4 | Utility-first CSS framework |
| shadcn/ui (New York style) | Component library built on Radix UI |
| Lucide React + Tabler Icons | Icon libraries |
| Geist Font | Typography (sans + mono) |
| React Query/TanStack Query | Server state management |
| React Table | Data table components |
| @dnd-kit | Drag-and-drop for kanban boards |
| Recharts | Dashboard analytics visualization |
| React Hook Form + Zod | Form handling and validation |
| next-themes | Dark/light mode theming |
| Sonner | Toast notifications |
| date-fns | Date manipulation |
| nuqs | URL state management |

### Backend & Database
| Technology | Purpose |
|------------|---------|
| PostgreSQL 17+ | Primary database |
| Prisma ORM | Database ORM with typed queries |
| pgvector extension | Vector embeddings for semantic search |
| Redis | Caching and session management |
| Resend | Transactional email delivery |
| React Email | Email templates |

### Authentication
| Technology | Purpose |
|------------|---------|
| Next-Auth v5 (beta.29) | Authentication framework |
| Prisma Adapter | Next-Auth database integration |
| bcryptjs | Password hashing |
| JWT | Session strategy |

### AI/ML
| Technology | Purpose |
|------------|---------|
| Vercel AI SDK | AI integration framework |
| OpenAI GPT-4o-mini | Chat completions and text generation |
| text-embedding-3-small | Vector embeddings (1536 dimensions) |
| MCP SDK | Model Context Protocol for AI agents |

---

## Directory Structure

```
taskhq.app/
├── actions/                        # Server Actions (Next.js 15)
│   ├── auth-actions.ts            # Authentication actions
│   ├── company-actions.ts         # Company management
│   ├── user.ts                    # User management
│   ├── dashboard/                 # Dashboard data actions
│   │   ├── charts/               # Chart data generation
│   │   │   ├── get-distribution-data.ts
│   │   │   └── get-task-timeline-data.ts
│   │   ├── get-board-metrics.ts
│   │   ├── get-dashboard-overview.ts
│   │   ├── get-task-metrics.ts
│   │   ├── get-task-table-data.ts
│   │   └── get-user-metrics.ts
│   ├── mail/                      # Email functionality
│   │   ├── account-actions.ts
│   │   ├── read-actions.ts
│   │   ├── resend-smtp.ts
│   │   └── send-actions.ts
│   ├── suggestions/               # AI suggestions
│   │   └── get-suggestions.ts
│   └── tasks/                     # Task & Board CRUD
│       ├── create-board.ts
│       ├── create-board-from-ai.ts
│       ├── create-board-section.ts
│       ├── create-task.ts
│       ├── delete-board.ts
│       ├── delete-board-section.ts
│       ├── delete-task.ts
│       ├── edit-board.ts
│       ├── edit-task.ts
│       ├── get-ai-board-requests.ts
│       ├── get-board.ts
│       ├── get-boards.ts
│       ├── get-board-sections.ts
│       ├── get-task.ts
│       ├── get-tasks.ts
│       ├── mark-done.ts
│       ├── refine-goal-conversation.ts
│       ├── retry-board-generation.ts
│       ├── update-active-tasks-due-date.ts
│       ├── bulk-update-due-dates.ts
│       ├── update-section-position.ts
│       └── update-task-position.ts
│
├── app/                            # Next.js App Router
│   ├── (app)/[cid]/               # Company-scoped protected routes
│   │   ├── ai-assistant/          # AI Assistant v1
│   │   ├── ai-assistant-v2/       # AI Assistant v2 (enhanced)
│   │   ├── dashboard/             # Analytics dashboard
│   │   │   ├── _components/       # Dashboard components
│   │   │   └── page.tsx
│   │   ├── docs/                  # Documentation pages
│   │   ├── settings/              # User settings
│   │   ├── tasks/                 # Task management
│   │   │   ├── [boardId]/        # Board detail view
│   │   │   │   ├── _components/  # Board-specific components
│   │   │   │   └── page.tsx
│   │   │   ├── _components/      # Shared task components
│   │   │   ├── _types/           # Task-related types
│   │   │   ├── search-params.ts  # URL state management
│   │   │   └── page.tsx          # Boards list
│   │   ├── tasks-list/           # Task detail views
│   │   │   ├── [taskId]/        # Individual task pages
│   │   │   └── page.tsx
│   │   └── layout.tsx            # Company layout wrapper
│   │
│   ├── api/                       # API Routes
│   │   ├── ai/                   # AI endpoints
│   │   │   ├── agents/           # AI agents
│   │   │   ├── analyze/          # Document analysis
│   │   │   ├── chat/             # Chat v1
│   │   │   ├── chat-v2/          # Chat v2 (enhanced)
│   │   │   ├── documents/        # Document processing
│   │   │   ├── embeddings/       # Vector embeddings
│   │   │   ├── metrics/          # AI metrics
│   │   │   ├── privacy/          # Data privacy
│   │   │   └── suggest/          # AI suggestions
│   │   ├── auth/                 # Authentication
│   │   │   ├── [...nextauth]/    # Next-Auth handlers
│   │   │   └── force-logout/     # Force logout
│   │   ├── company/              # Company validation
│   │   │   └── validate-access/
│   │   ├── health/               # Health checks
│   │   │   ├── ai/               # AI system health
│   │   │   └── mcp/              # MCP health
│   │   ├── mcp/                  # Model Context Protocol
│   │   │   ├── [transport]/
│   │   │   ├── analytics/
│   │   │   ├── boards/
│   │   │   ├── search/
│   │   │   └── tasks/
│   │   └── verify-email/         # Email verification
│   │
│   ├── auth/signin/               # Sign-in page
│   ├── globals.css                # Global Tailwind styles
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Landing page
│
├── components/                     # React Components
│   ├── ai/                        # AI-related components
│   │   ├── ai-assistant.tsx
│   │   ├── ai-assistant-v2.ts
│   │   ├── project-insights.tsx
│   │   └── smart-suggestions.tsx
│   ├── auth/                      # Auth components
│   │   └── sign-out-button.tsx
│   ├── dashboard/                 # Dashboard components
│   │   ├── charts/
│   │   ├── metrics/
│   │   └── tables/
│   ├── quickcreate/               # Quick create functionality
│   ├── ui/                        # shadcn/ui components
│   ├── app-sidebar.tsx
│   ├── data-table.tsx
│   ├── nav-*.tsx                  # Navigation components
│   ├── site-header.tsx
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
│
├── emails/                         # React Email Templates
│   └── verification-email.tsx
│
├── lib/                            # Utility Libraries
│   ├── ai/                        # AI/ML utilities
│   │   ├── __tests__/            # AI system tests
│   │   ├── agent-core.ts         # Core AI agent logic
│   │   ├── agent-orchestrator.ts # Agent orchestration
│   │   ├── config.ts             # AI configuration
│   │   ├── context-assembly.ts   # Context preparation
│   │   ├── conversation-memory.ts
│   │   ├── data-extraction.ts
│   │   ├── document-processor.ts # Document processing
│   │   ├── embedding-service.ts  # Vector embeddings
│   │   ├── embedding-storage.ts
│   │   ├── embedding-triggers.ts
│   │   ├── mcp-*.ts              # MCP integration
│   │   ├── monitoring.ts
│   │   ├── rag-processor.ts      # RAG processing
│   │   ├── specialized-agents.ts
│   │   └── vector-search.ts      # Semantic search
│   ├── dashboard/                 # Dashboard utilities
│   │   └── chart-utils.ts
│   ├── generated/prisma/          # Generated Prisma client
│   ├── monitoring/                # Monitoring utilities
│   │   └── ai-metrics.ts
│   ├── security/                  # Security utilities
│   │   ├── ai-security.ts        # AI security service
│   │   └── company-access-validator.ts
│   ├── db.ts                      # Database connection
│   ├── email-verification.ts
│   ├── send-verification-email.ts
│   └── utils.ts                   # General utilities
│
├── prisma/                         # Prisma Configuration
│   └── schema.prisma              # Database schema
│
├── types/                          # TypeScript Types
│   └── next-auth.d.ts             # Next-Auth extensions
│
├── auth.ts                         # Next-Auth configuration
├── middleware.ts                   # Route protection middleware
├── components.json                 # shadcn/ui config
├── next.config.js                  # Next.js config
├── tailwind.config.js              # Tailwind config
└── tsconfig.json                   # TypeScript config
```

---

## Routing & Multi-Tenancy

### URL Structure

TaskHQ implements company-based multi-tenancy using dynamic route segments:

```
/{companyId}/{feature}
```

**Examples:**
- `/cljk8xyzabc/dashboard` - Company dashboard
- `/cljk8xyzabc/tasks` - Task boards list
- `/cljk8xyzabc/tasks/board123` - Specific board view
- `/cljk8xyzabc/tasks-list/task456` - Task detail view

### Middleware Route Protection

**File:** `middleware.ts`

```typescript
// Route protection logic
1. Allow public routes: /, /auth/*, /api/*, /_next/*, static files
2. Extract company ID from URL: /{cid}/...
3. Validate company ID format (not undefined, null, or empty)
4. Add company ID to request headers (x-company-id)
5. Pass to server components for database validation
```

### Route Groups

```
app/
├── (app)/[cid]/     # Protected company routes
│   └── layout.tsx   # Company context provider
├── auth/            # Public authentication routes
└── api/             # API routes (no auth for some)
```

### Company Access Validation

Company access is validated at multiple levels:
1. **Middleware**: Basic URL structure validation
2. **Server Actions**: Database-level membership verification
3. **JWT Callbacks**: Company memberships cached in token

---

## Component Architecture

### Layout Hierarchy

```
RootLayout (app/layout.tsx)
├── SessionProvider (Next-Auth)
├── ThemeProvider (next-themes)
└── Body
    └── CompanyLayout (app/(app)/[cid]/layout.tsx)
        ├── AppSidebar (navigation)
        └── Main Content Area
            └── Page Content
```

### Component Categories

#### 1. Server Components (Default)
- Page components (`page.tsx`)
- Layout components (`layout.tsx`)
- Data fetching components
- Static content components

#### 2. Client Components (`"use client"`)
- Interactive forms
- Drag-and-drop boards
- Theme toggles
- Charts and visualizations
- Modal dialogs

#### 3. UI Components (`components/ui/`)
- shadcn/ui primitives (Button, Card, Dialog, etc.)
- Composed from Radix UI primitives
- Styled with Tailwind CSS

#### 4. Feature Components
- `components/ai/` - AI assistant interfaces
- `components/dashboard/` - Analytics components
- `components/auth/` - Authentication UI

### Data Flow Pattern

```
Server Component
    ↓ (Server Action call)
Server Action (actions/*.ts)
    ↓ (Prisma query)
Database
    ↓ (Response)
Server Action
    ↓ (Serialized data)
Server Component
    ↓ (Props)
Client Component (if needed)
```

---

## State Management

### Server State (React Query/TanStack Query)

Used for caching and synchronizing server data:
- Task lists
- Board data
- User information
- Dashboard metrics

### Client State

| Type | Solution |
|------|----------|
| Form state | React Hook Form |
| URL state | nuqs |
| Theme | next-themes |
| Drag-and-drop | @dnd-kit |
| Auth session | Next-Auth |
| Toast notifications | Sonner |

### Session State (Next-Auth)

```typescript
// Session structure
session: {
  user: {
    id: string;
    email: string;
    name: string;
    memberships: CompanyMembership[];
    activeCompanyId: string | null;
  }
}
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│      User       │────<│CompanyMembership│>────│     Company     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │     │ companyId       │     │ id              │
│ email           │     │ userId          │     │ name            │
│ name            │     │ role (MEMBER,   │     │ createdAt       │
│ password        │     │   ADMIN, OWNER) │     │ updatedAt       │
│ emailVerified   │     │ createdAt       │     └────────┬────────┘
│ role            │     └─────────────────┘              │
│ company_id      │                                       │
└────────┬────────┘                                       │
         │                                                │
         │     ┌──────────────────────────────────────────┘
         │     │
         ↓     ↓
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Board       │────<│  BoardSection   │────<│      Task       │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │     │ id              │     │ id              │
│ name            │     │ name            │     │ title           │
│ description     │     │ position        │     │ description     │
│ createdBy       │     │ boardId         │     │ priority        │
│ access[]        │     │ createdAt       │     │ status          │
│ companyId       │     │ updatedAt       │     │ dueDate         │
│ createdAt       │     └─────────────────┘     │ position        │
│ updatedAt       │                             │ assignedToId    │
└────────┬────────┘                             │ createdById     │
         │                                      │ boardSectionId  │
         │                                      └────────┬────────┘
         │                                               │
         ↓                                               ↓
┌─────────────────┐                             ┌─────────────────┐
│ BoardEmbedding  │                             │  TaskEmbedding  │
├─────────────────┤                             ├─────────────────┤
│ id              │                             │ id              │
│ boardId         │                             │ taskId          │
│ embedding       │                             │ embedding       │
│ content         │                             │ content         │
│ metadata        │                             │ metadata        │
└─────────────────┘                             └─────────────────┘
```

### Core Models (15 Total)

| Model | Purpose |
|-------|---------|
| User | User accounts and authentication |
| Account | OAuth provider accounts |
| Session | Next-Auth sessions |
| VerificationToken | Email verification tokens |
| Company | Organization/company entities |
| CompanyMembership | User-company relationships |
| Board | Project boards |
| BoardSection | Kanban columns |
| Task | Individual tasks |
| TaskHistory | Task change audit log |
| TaskEmbedding | Vector embeddings for tasks |
| BoardEmbedding | Vector embeddings for boards |
| AIConversation | AI chat conversations |
| AIMessage | Chat messages |
| Document | Uploaded documents |
| DocumentEmbedding | Document vector embeddings |
| ConversationSummary | AI conversation summaries |
| SecurityAuditLog | Security event logs |
| AIGeneratedBoardRequest | AI board generation requests |
| UserMailAccount | User email account configurations |

### Enums

```prisma
enum UserRole {
  USER
  CONTRIBUTOR
  EDITOR
  MEDIA
  ADMIN
}

enum CompanyRole {
  MEMBER
  ADMIN
  OWNER
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum TaskStatusNew {
  NEW
  IN_PROGRESS
  COMPLETED
  CANCELLED
  ON_HOLD
}

enum AIBoardRequestStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

---

## Authentication System

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Registration Flow                           │
├─────────────────────────────────────────────────────────────────┤
│  1. User submits registration form                              │
│  2. Server action validates input (Zod)                         │
│  3. Password hashed with bcrypt (12 rounds)                     │
│  4. User created with emailVerified = null                      │
│  5. Verification email sent via Resend                          │
│  6. User clicks verification link                               │
│  7. Token validated and emailVerified timestamp set             │
│  8. User can now sign in                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Sign-In Flow                                │
├─────────────────────────────────────────────────────────────────┤
│  1. User submits credentials                                    │
│  2. Next-Auth Credentials provider validates                    │
│  3. Email verification status checked                           │
│  4. Password compared with bcrypt                               │
│  5. JWT token created with user data                            │
│  6. JWT callback fetches company memberships                    │
│  7. If no company, default company auto-created                 │
│  8. activeCompanyId set to first company                        │
│  9. Session callback exposes memberships to client              │
│ 10. User redirected to /{activeCompanyId}/dashboard             │
└─────────────────────────────────────────────────────────────────┘
```

### Providers Configured

1. **Credentials** - Email/password authentication
2. **Google OAuth** - Google sign-in
3. **GitHub OAuth** - GitHub sign-in
4. **Resend (Magic Link)** - Passwordless email authentication

### JWT Token Structure

```typescript
token: {
  sub: string;              // User ID
  memberships: [{           // Company memberships
    companyId: string;
    userId: string;
    role: CompanyRole;
    company: {
      id: string;
      name: string;
    }
  }];
  activeCompanyId: string;  // Currently selected company
}
```

### Session Callbacks

**File:** `auth.ts`

```typescript
// JWT Callback - Runs on every request
jwt({ token, user, trigger, session }) {
  // 1. Fetch fresh memberships from database
  // 2. Auto-create default company if none exists
  // 3. Handle company switching via session update
}

// Session Callback - Exposes data to client
session({ session, token }) {
  // Map token data to session.user
}
```

---

## AI/ML Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI System Architecture                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │ AI Assistant │────→│ RAG Processor│────→│ Vector Search│    │
│  │   (Chat UI)  │     │              │     │              │    │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘    │
│         │                    │                     │            │
│         ↓                    ↓                     ↓            │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │ OpenAI API   │     │  Embedding   │     │   pgvector   │    │
│  │ GPT-4o-mini  │     │   Service    │     │   Database   │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Document   │────→│  Tesseract   │     │    MCP       │    │
│  │  Processor   │     │    (OCR)     │     │  Integration │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Embedding Service (`lib/ai/embedding-service.ts`)

- Generates vector embeddings using OpenAI `text-embedding-3-small`
- 1536-dimensional vectors
- In-memory caching with content hashing
- Batch embedding support for efficiency

```typescript
// Core methods
generateEmbedding(content: string): Promise<number[]>
generateEmbeddings(contents: string[]): Promise<number[][]>
```

#### 2. Vector Search Service (`lib/ai/vector-search.ts`)

- Semantic search using pgvector cosine similarity
- Hybrid search combining vector + keyword matching
- Company-scoped queries for data isolation
- Configurable similarity thresholds

```typescript
// Core methods
searchTasks(query: VectorSearchQuery): Promise<VectorSearchResult[]>
hybridSearch(query, vectorWeight, keywordWeight): Promise<VectorSearchResult[]>
findSimilarTasksTyped(embedding, companyId, limit): Promise<Task[]>
findSimilarBoardsTyped(embedding, companyId, limit): Promise<Board[]>
```

#### 3. Document Processor (`lib/ai/document-processor.ts`)

Supports multiple document types:
- **PDF**: Text extraction via `pdf-parse`
- **DOCX**: Word documents via `mammoth`
- **CSV**: Parsing via `papaparse`
- **XLSX**: Excel via `xlsx`
- **Images**: OCR via `tesseract.js`

#### 4. RAG Processor (`lib/ai/rag-processor.ts`)

- Retrieval-Augmented Generation for context-aware responses
- Assembles relevant context from tasks, boards, and documents
- Combines with user query for AI completion

#### 5. AI Security Service (`lib/security/ai-security.ts`)

- Rate limiting per user per operation
- Input validation and sanitization
- Permission checking
- Security audit logging

### Embedding Triggers

Embeddings are automatically generated/updated on:
- Task creation (`triggerTaskEmbeddingUpdate`)
- Task update (`triggerTaskEmbeddingUpdate`)
- Task deletion (`triggerTaskEmbeddingDeletion`)
- Board creation/update
- Document upload

### MCP Integration

Model Context Protocol enables AI agent orchestration:
- Task management tools
- Board operations
- Search capabilities
- Analytics access

**Endpoints:**
- `/api/mcp/tasks/` - Task operations
- `/api/mcp/boards/` - Board operations
- `/api/mcp/search/` - Search capabilities
- `/api/mcp/analytics/` - Analytics access

---

## API Architecture

### Server Actions

Server actions are the primary data mutation layer:

**Location:** `/actions/**/*.ts`

**Pattern:**
```typescript
"use server";

export async function actionName(input: InputType): Promise<ResultType> {
  // 1. Get session
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  // 2. Validate input (Zod)
  const validated = Schema.parse(input);

  // 3. Validate company access
  // 4. Execute database operation
  // 5. Return result
}
```

### API Routes

RESTful API routes for external/client access:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/[...nextauth]` | * | Next-Auth handlers |
| `/api/verify-email` | GET | Email verification |
| `/api/company/validate-access` | POST | Company access check |
| `/api/ai/chat` | POST | AI chat (v1) |
| `/api/ai/chat-v2` | POST | AI chat (v2, enhanced) |
| `/api/ai/suggest` | POST | AI suggestions |
| `/api/ai/embeddings` | POST | Generate embeddings |
| `/api/ai/documents` | POST | Document processing |
| `/api/ai/analyze` | POST | Document analysis |
| `/api/ai/metrics` | GET | AI metrics |
| `/api/ai/privacy` | DELETE | GDPR data deletion |
| `/api/health/ai` | GET | AI system health |
| `/api/health/mcp` | GET | MCP system health |
| `/api/mcp/[transport]` | * | MCP transport |

### Error Handling Pattern

Server actions return consistent response shapes:

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: string }

// Or throw for critical errors
throw new Error("Unauthorized");
```

---

## Performance Considerations

### Database Indexes

Current indexes defined in schema:
- `User.emailVerificationToken`
- `User.company_id`
- `UserMailAccount.userId`
- `Board.companyId`
- `AIConversation.companyId`
- `AIConversation.userId`
- `Document.companyId`
- `Document.uploadedBy`
- `Document.taskId`
- `Document.boardId`
- `SecurityAuditLog.userId`
- `SecurityAuditLog.action`
- `SecurityAuditLog.risk`
- `SecurityAuditLog.timestamp`
- `AIGeneratedBoardRequest.userId`
- `AIGeneratedBoardRequest.companyId`
- `AIGeneratedBoardRequest.status`

### Caching Strategy

1. **Embedding Cache**: In-memory cache in `EmbeddingService`
2. **Rate Limit Store**: In-memory map in `AISecurityService`
3. **Session Cache**: JWT tokens with company memberships
4. **React Query**: Client-side server state caching

### N+1 Query Prevention

Many queries use Prisma `include` for eager loading:
```typescript
db.task.findMany({
  include: {
    assignedTo: true,
    createdBy: true,
    boardSection: {
      include: { board: true }
    }
  }
});
```

---

## Security Layers

1. **Middleware**: URL structure validation
2. **Next-Auth**: Session validation
3. **Server Actions**: Company membership verification
4. **Database**: Row-level filtering by company
5. **AI Security**: Rate limiting, input validation
6. **Audit Logging**: Security event tracking

---

*Last Updated: January 2026*
*Document Version: 1.0*
