# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TaskHQ (taskhq.xmation.ai)** is a Next.js 15.4.4 application built as an AI-powered task and project management platform with advanced document processing capabilities. It features a comprehensive authentication system, kanban-style task boards with drag-and-drop functionality, AI assistant integration, vector embeddings for semantic search, document processing with OCR, MCP (Model Context Protocol) integration, comprehensive dashboard analytics, and company-based access control. The project uses TypeScript, App Router architecture, Prisma ORM with PostgreSQL (with pgvector extension), Next-Auth v5, AI SDK with OpenAI integration, and shadcn/ui components with enhanced task management and analytics capabilities.

## Development Commands

### Core Development
- `pnpm dev` - Start development server with Turbopack (http://localhost:3000)
- `pnpm build` - Build the application for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint for code linting

### Database Management
- `npx prisma generate` - Generate Prisma client after schema changes (includes typed SQL)
- `npx prisma db push` - Push schema changes to database
- `npx prisma studio` - Open Prisma Studio for database inspection
- `npx prisma migrate dev` - Create and apply new database migrations

### Testing
- `pnpm test` - Run test suite (Jest/Vitest)
- `pnpm test:integration` - Run integration tests for AI system

### AI & Document Processing
- Automatic embedding generation on task/board creation
- Document processing supports: PDF, DOCX, CSV, XLSX, images (OCR)
- Vector similarity search with pgvector extension


## Architecture & Key Technologies

### Frontend Stack
- **Next.js 15.4.4** with App Router (`app/` directory structure)
- **React 19.1.0** with TypeScript (ES2017 target)
- **Tailwind CSS v4** with PostCSS and CSS variables support
- **shadcn/ui** components (New York style, neutral base color, CSS variables)
- **Lucide React** icons and **@tabler/icons-react** for additional icons
- **Geist font family** (sans and mono variants from Google Fonts)
- **React Query/TanStack Query** for data fetching and **React Table** for data tables
- **@dnd-kit** for drag-and-drop functionality in kanban boards
- **Recharts** for dashboard analytics and data visualization
- **React Hook Form** with Zod validation and **@hookform/resolvers**
- **next-themes** for dark/light mode toggle
- **Sonner** for toast notifications
- **date-fns** for date manipulation and **React Day Picker** for calendar components
- **nuqs** for URL state management
- **use-debounce** for performance optimization
- **Vaul** for drawer components

### Authentication System
- **Next-Auth v5 (beta.29)** with Prisma adapter
- **Server Actions** architecture for auth operations
- **Multi-provider support**:
  - Credentials (email/password with bcrypt hashing)
  - Google OAuth
  - GitHub OAuth
- **Email verification** with Resend integration
- **Company-based access control** via auto-generated `cid` (company ID)
- **JWT session strategy** with custom callbacks
- **Open registration**: Email verification required for all users

### Database & ORM
- **Prisma ORM** with PostgreSQL database and **pgvector extension** for vector embeddings
- **Custom Prisma client path**: `lib/generated/prisma/`
- **Auto-generated CUIDs** for all primary keys
- **Typed SQL** support with custom queries for vector similarity search
- **Redis** for caching and session management
- **Database Models**:
  - `User` - with email verification, password hashing, company ID, role-based access
  - `Account` - OAuth account linking
  - `Session` - Next-Auth sessions
  - `VerificationToken` - Email verification tokens
  - `Task` - Task management with priorities, status, assignments, due dates, and document associations
  - `Board` - Project boards with access control and document associations
  - `BoardSection` - Kanban columns/sections within boards
  - `TaskHistory` - Task change tracking and audit logs
  - `TaskEmbedding` - Vector embeddings for semantic task search (1536 dimensions)
  - `BoardEmbedding` - Vector embeddings for semantic board search (1536 dimensions)
  - `AIConversation` - AI chat conversations with context and summaries
  - `AIMessage` - Individual messages in AI conversations
  - `Document` - Document processing with OCR, text extraction, and AI insights
  - `DocumentEmbedding` - Vector embeddings for document content search
  - `ConversationSummary` - AI conversation summaries, key topics, and memory
  - `SecurityAuditLog` - Security audit trails and monitoring
- **Indexed fields** for optimized queries including vector similarity search
- **Prisma Accelerate** extension support

### Server Actions Architecture
- **Location**: `/actions` folder with `"use server"` directives
- **Authentication actions**:
  - `registerUser()` - User registration with email verification
  - `authenticateUser()` - Login with credentials
  - `signOutUser()` - Logout functionality
- **Task management actions**:
  - Board CRUD operations (create, read, update, delete, edit)
  - Task CRUD operations with assignments and status updates
  - Board section management for kanban columns
  - Drag-and-drop position updates for tasks and sections
  - Task completion and marking as done
- **Dashboard analytics actions**:
  - Board metrics and statistics
  - Task metrics and distribution data
  - User activity metrics
  - Chart data generation (timeline, distribution)
  - Task table data with filtering and pagination
- **Form Integration** with Next.js 15 server actions

### Email System
- **Resend** for transactional emails
- **React Email** components for email templates
- **Email verification flow** with token generation
- **Custom from address**: `TaskHQ <pavel@endorphinit.com>`

### AI & Machine Learning Stack
- **AI SDK (@ai-sdk/openai, @ai-sdk/react)** for OpenAI integration and React hooks
- **OpenAI GPT-4o-mini** for chat completions and text generation
- **OpenAI text-embedding-3-small** for vector embeddings (1536 dimensions)
- **pgvector** PostgreSQL extension for vector similarity search
- **Model Context Protocol (@modelcontextprotocol/sdk, @vercel/mcp-adapter)** for AI agent orchestration

### Document Processing Stack
- **Tesseract.js** for OCR (Optical Character Recognition) on images
- **pdf-parse** for PDF text extraction
- **mammoth** for Word document (.docx) processing
- **papaparse** for CSV parsing and processing
- **xlsx** for Excel spreadsheet processing

### AI & Machine Learning Features
- **AI Assistant v2**: Advanced chat interface with tool calling and context awareness
- **Vector Embeddings**: OpenAI embeddings for semantic search (1536 dimensions)
- **RAG (Retrieval Augmented Generation)**: Context-aware AI responses using document and task embeddings
- **Document Processing**: OCR with Tesseract.js, PDF parsing, Word document processing (.docx)
- **MCP Integration**: Model Context Protocol for AI agent orchestration
- **Conversation Memory**: AI conversation summaries with key topics and action items
- **Semantic Search**: Vector similarity search across tasks, boards, and documents
- **AI Monitoring**: Performance metrics and security audit logs

### Task Management Features
- **Kanban Board System**: Drag-and-drop task management across board sections
- **Task Priorities**: LOW, MEDIUM, HIGH, CRITICAL priority levels
- **Task Status**: NEW, IN_PROGRESS, COMPLETED, CANCELLED, ON_HOLD
- **User Roles**: USER, CONTRIBUTOR, EDITOR, MEDIA, ADMIN role hierarchy
- **Task Assignment**: Multi-user task assignment with creator/assignee tracking
- **Board Access Control**: Permission-based board access with user arrays
- **Task History**: Complete audit trail of task changes and updates
- **Task Detail View**: Comprehensive task pages with activity, files, and descriptions
- **Document Attachments**: Link documents to tasks and boards with AI-powered insights

### Dashboard & Analytics Features
- **Interactive Charts**: Task timeline, distribution, and status analytics using Recharts
- **Metrics Cards**: Board metrics, task metrics, and user activity summaries
- **Data Tables**: Advanced task tables with filtering, sorting, and pagination
- **Real-time Updates**: Dynamic data refresh and responsive design

### File Structure
```
├── actions/                    # Server actions (Next.js 15)
│   ├── auth-actions.ts        # Authentication server actions
│   ├── user.ts                # User management actions
│   ├── users/                 # User-related actions
│   │   └── get-users.tsx     # User retrieval functions
│   ├── dashboard/             # Dashboard analytics actions
│   │   ├── charts/            # Chart data generation
│   │   │   ├── get-distribution-data.ts
│   │   │   └── get-task-timeline-data.ts
│   │   ├── get-board-metrics.ts
│   │   ├── get-dashboard-overview.ts
│   │   ├── get-task-metrics.ts
│   │   ├── get-task-table-data.ts
│   │   └── get-user-metrics.ts
│   └── tasks/                 # Task management actions
│       ├── create-board.ts    # Board creation
│       ├── create-board-section.ts # Board section management
│       ├── create-task.ts     # Task creation
│       ├── delete-board.ts    # Board deletion
│       ├── delete-board-section.ts # Board section deletion
│       ├── delete-task.ts     # Task deletion
│       ├── edit-board.ts      # Board editing
│       ├── edit-task.ts       # Task editing
│       ├── get-board.ts       # Board retrieval
│       ├── get-boards.ts      # Multiple boards retrieval
│       ├── get-board-sections.ts # Board sections retrieval
│       ├── get-task.ts        # Single task retrieval
│       ├── get-tasks.ts       # Multiple tasks retrieval
│       ├── mark-done.ts       # Task completion
│       ├── update-section-position.ts # Section drag-and-drop
│       └── update-task-position.ts # Task drag-and-drop
├── app/                       # Next.js App Router
│   ├── (app)/[cid]/          # Company-specific protected routes
│   │   ├── ai-assistant/     # AI Assistant v1 page
│   │   ├── ai-assistant-v2/  # Enhanced AI Assistant v2 page
│   │   ├── dashboard/        # Dashboard with analytics and charts
│   │   │   ├── _components/  # Dashboard-specific components
│   │   │   │   ├── chart-area-interactive.tsx
│   │   │   │   ├── dynamic-section-cards.tsx
│   │   │   │   ├── enhanced-dynamic-cards.tsx
│   │   │   │   ├── section-cards.tsx
│   │   │   │   └── simple-section-cards.tsx
│   │   │   └── page.tsx      # Dashboard overview
│   │   ├── docs/             # Documentation pages
│   │   ├── settings/         # User settings pages
│   │   ├── tasks/            # Task management interface
│   │   │   ├── [boardId]/    # Individual board views
│   │   │   │   ├── _components/ # Board-specific components
│   │   │   │   │   ├── create-board-section.tsx
│   │   │   │   │   ├── create-task-button.tsx
│   │   │   │   │   ├── dnd-board.tsx # Drag-and-drop kanban
│   │   │   │   │   └── task-actions.tsx
│   │   │   │   └── page.tsx  # Board detail page
│   │   │   ├── _components/  # Task management components
│   │   │   │   ├── board-actions.tsx
│   │   │   │   ├── create-board-button.tsx
│   │   │   │   ├── error-boundary.tsx
│   │   │   │   └── search.tsx
│   │   │   ├── _types/       # Task-related TypeScript types
│   │   │   │   └── index.ts
│   │   │   ├── search-params.ts # URL state management
│   │   │   └── page.tsx      # Task boards overview
│   │   ├── tasks-list/       # Detailed task views
│   │   │   ├── [taskId]/     # Individual task detail pages
│   │   │   │   ├── _components/ # Task detail components
│   │   │   │   │   ├── task-activity.tsx
│   │   │   │   │   ├── task-description.tsx
│   │   │   │   │   ├── task-detail-header.tsx
│   │   │   │   │   ├── task-files.tsx
│   │   │   │   │   └── task-side-rail.tsx
│   │   │   │   └── page.tsx  # Task detail page
│   │   │   └── page.tsx      # Task list overview
│   │   └── layout.tsx        # Company layout
│   ├── auth/signin/          # Authentication pages
│   ├── api/                  # API routes
│   │   ├── ai/               # AI-related API endpoints
│   │   │   ├── agents/       # AI agents and specialized tools
│   │   │   │   ├── metrics/  # Metrics agent
│   │   │   │   └── route.ts  # Main agents endpoint
│   │   │   ├── analyze/      # Document analysis
│   │   │   ├── chat/         # AI chat endpoints (v1 & v2)
│   │   │   ├── chat-v2/      # Enhanced chat with tool calling
│   │   │   ├── documents/    # Document processing
│   │   │   ├── embeddings/   # Vector embeddings generation
│   │   │   ├── metrics/      # AI metrics and monitoring
│   │   │   ├── privacy/      # Privacy and security
│   │   │   ├── suggest/      # AI suggestions (v1 & v2)
│   │   │   └── telemetry/    # AI telemetry and monitoring
│   │   ├── auth/[...nextauth]/ # Next-Auth configuration
│   │   ├── health/           # Health check endpoints
│   │   │   ├── ai/           # AI system health
│   │   │   └── mcp/          # MCP system health
│   │   ├── mcp/              # Model Context Protocol endpoints
│   │   │   ├── [transport]/  # MCP transport layer
│   │   │   ├── analytics/    # MCP analytics
│   │   │   ├── boards/       # MCP board operations
│   │   │   ├── search/       # MCP search capabilities
│   │   │   └── tasks/        # MCP task operations
│   │   ├── register/         # Registration endpoint
│   │   └── verify-email/     # Email verification endpoint
│   ├── globals.css           # Global Tailwind styles
│   ├── layout.tsx            # Root layout with SessionProvider
│   └── page.tsx              # Landing page
├── components/               # React components
│   ├── ai/                   # AI-related components
│   │   ├── ai-assistant.tsx  # AI Assistant v1 component
│   │   ├── ai-assistant-v2.ts # AI Assistant v2 logic
│   │   ├── project-insights.tsx # AI project insights
│   │   └── smart-suggestions.tsx # AI smart suggestions
│   ├── app-sidebar.tsx       # Main application sidebar
│   ├── auth/                 # Authentication components
│   │   └── sign-out-button.tsx
│   ├── calendar-10.tsx       # Calendar component
│   ├── dashboard/            # Dashboard components
│   │   ├── charts/           # Chart components
│   │   │   ├── distribution-chart.tsx
│   │   │   └── task-timeline-chart.tsx
│   │   ├── metrics/          # Metrics components
│   │   │   ├── board-metrics-card.tsx
│   │   │   ├── task-metrics-card.tsx
│   │   │   └── user-activity-card.tsx
│   │   └── tables/           # Data table components
│   │       └── task-data-table.tsx
│   ├── data-table.tsx        # Generic data table component
│   ├── nav-documents.tsx     # Document navigation
│   ├── nav-main.tsx          # Main navigation
│   ├── nav-secondary.tsx     # Secondary navigation
│   ├── nav-user.tsx          # User navigation
│   ├── quickcreate/          # Quick create functionality
│   │   └── form/
│   │       └── quick-create-form.tsx
│   ├── site-header.tsx       # Site header component
│   ├── theme-provider.tsx    # Theme context provider
│   ├── theme-toggle.tsx      # Dark/light mode toggle
│   └── ui/                   # shadcn/ui components (extensive collection)
├── emails/                   # React Email templates
│   └── verification-email.tsx
├── lib/                      # Utility libraries
│   ├── ai/                   # AI and ML utilities
│   │   ├── __tests__/        # AI system tests
│   │   │   └── agent-system.test.ts
│   │   ├── agent-core.ts     # Core AI agent functionality
│   │   ├── agent-orchestrator.ts # AI agent orchestration
│   │   ├── config.ts         # AI configuration
│   │   ├── context-assembly.ts # Context assembly for AI
│   │   ├── conversation-memory.ts # AI conversation memory
│   │   ├── data-extraction.ts # AI data extraction
│   │   ├── document-processor.ts # Document processing with AI
│   │   ├── embedding-service.ts # Vector embedding generation
│   │   ├── embedding-storage.ts # Vector embedding storage
│   │   ├── embedding-triggers.ts # Embedding generation triggers
│   │   ├── mcp-auth.ts       # MCP authentication
│   │   ├── mcp-client-pool.ts # MCP client management
│   │   ├── mcp-middleware.ts # MCP middleware
│   │   ├── monitoring.ts     # AI system monitoring
│   │   ├── rag-processor.ts  # RAG processing logic
│   │   ├── simple-mcp-client.ts # Simple MCP client
│   │   ├── specialized-agents.ts # Specialized AI agents
│   │   └── vector-search.ts  # Vector similarity search
│   ├── dashboard/            # Dashboard utilities
│   │   └── chart-utils.ts    # Chart utility functions
│   ├── generated/prisma/     # Generated Prisma client
│   ├── monitoring/           # Monitoring utilities
│   │   └── ai-metrics.ts     # AI metrics collection
│   ├── security/             # Security utilities
│   │   └── ai-security.ts    # AI security measures
│   ├── db.ts                 # Database connection
│   ├── email-verification.ts # Email verification logic
│   ├── send-verification-email.ts # Email sending
│   └── utils.ts              # Utility functions
├── prisma/                   # Prisma configuration
│   └── schema.prisma         # Database schema
├── types/                    # TypeScript type definitions
│   └── next-auth.d.ts        # Next-Auth type extensions
├── auth.ts                   # Next-Auth configuration
├── middleware.ts             # Route protection middleware
└── components.json           # shadcn/ui configuration
```

## Authentication Flow

### Registration Process
1. **Open Registration**: Any valid email address accepted
2. **User Creation**: Prisma auto-generates CUID for user and company ID
3. **Password Hashing**: bcrypt with 12 rounds
4. **Email Verification**: Resend sends verification email with React Email template
5. **Account Status**: User created but email not verified initially
6. **Role Assignment**: Default USER role assigned, upgradeable to higher roles

### Sign-in Process
1. **Credentials Validation**: Server action validates email/password
2. **Email Verification Check**: Must be verified to sign in
3. **Session Creation**: Next-Auth JWT tokens with custom `cid` field
4. **Route Access**: Redirects to company-specific routes (`/[cid]/dashboard` or `/[cid]/tasks`)

### Company Access Control
- Each user gets unique `cid` (company ID) auto-generated by Prisma
- Routes protected by `[cid]` dynamic segments
- JWT tokens include company ID for session-based access control
- Middleware allows auth routes and API routes, protects app routes

## Database Schema Details

### User Model
```prisma
model User {
  id                      String    @id @default(cuid())
  name                    String?
  email                   String    @unique
  emailVerified           DateTime? @map("email_verified")
  emailVerificationToken  String?   @unique @map("email_verification_token")
  emailTokenExpires       DateTime? @map("email_token_expires")
  image                   String?
  password                String?
  cid                     String?   @default(cuid()) @map("company_id")
  role                    UserRole  @default(USER)
  createdAt               DateTime  @default(now()) @map("created_at")
  updatedAt               DateTime  @updatedAt @map("updated_at")
  
  accounts Account[]
  sessions Session[]
  assignedTasks Task[] @relation("AssignedTasks")
  createdTasks  Task[] @relation("CreatedTasks")
  
  @@index([cid])
  @@index([emailVerificationToken])
}

enum UserRole {
  USER
  CONTRIBUTOR
  EDITOR
  MEDIA
  ADMIN
}
```

### Task Management Models
```prisma
model Task {
  id              String         @id @default(cuid())
  title           String
  description     String
  priority        TaskPriority   @default(MEDIUM)
  status          TaskStatusNew  @default(NEW)
  dueDate         DateTime
  position        Int            @default(0)
  assignedToId    String        
  assignedTo      User           @relation("AssignedTasks", fields: [assignedToId], references: [id])
  createdById     String         
  createdBy       User           @relation("CreatedTasks", fields: [createdById], references: [id])
  boardSectionId  String
  boardSection    BoardSection   @relation(fields: [boardSectionId], references: [id])
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  history         TaskHistory[]
}

model Board {
  id            String         @id @default(cuid())
  name          String
  description   String?
  createdBy     String
  access        String[]       # Array of user IDs with access
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  boardSections BoardSection[]
}

model BoardSection {
  id        String   @id @default(cuid())
  name      String
  position  Int      @default(0)
  boardId   String
  board     Board    @relation(fields: [boardId], references: [id])
  tasks     Task[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
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
```

## Environment Variables

### Required Variables (see `.env.example`)
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/taskhq"

# Redis (for caching and sessions)
REDIS_URL="redis://localhost:6379"

# NextAuth.js
AUTH_SECRET="your-secret-here"  # JWT signing secret
NEXTAUTH_URL="http://localhost:3000"

# Email (Resend)
RESEND_API_KEY="your-resend-api-key"

# AI & OpenAI Integration
OPENAI_API_KEY="your-openai-api-key"
AI_MODEL="gpt-4o-mini"  # Default AI model
EMBEDDING_MODEL="text-embedding-3-small"  # Default embedding model

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# MCP (Model Context Protocol) - Optional
MCP_SERVER_URL=""
MCP_AUTH_TOKEN=""

# Document Processing - Optional
TESSERACT_WORKER_LOAD_TIME="2000"  # OCR processing timeout
```

## Configuration Files

### TypeScript Configuration
- **Target**: ES2017
- **Module Resolution**: bundler
- **Path Mapping**: `@/*` → `./`
- **JSX**: preserve
- **Strict Mode**: enabled

### ESLint Configuration
- **Extends**: next/core-web-vitals, next/typescript
- **Ignores**: Generated files (`lib/generated/**`, `prisma/generated/**`)

### shadcn/ui Configuration
- **Style**: New York
- **Base Color**: neutral
- **CSS Variables**: enabled
- **Icon Library**: lucide
- **Component Aliases**: Configured for `@/components`, `@/lib`, etc.

### Tailwind CSS
- **Version**: v4 with PostCSS plugin
- **CSS Location**: `app/globals.css`
- **Font Variables**: Geist Sans and Mono

## Development Guidelines

### Code Organization
- **Server Actions**: Use `"use server"` directive, handle form data and task operations
- **Authentication**: Always check email verification status
- **Database**: Use generated Prisma client from `@/lib/generated/prisma`
- **Components**: Follow shadcn/ui patterns with TypeScript
- **Styling**: Use Tailwind with CSS variables, Geist fonts
- **Task Management**: Utilize @dnd-kit for drag-and-drop interactions
- **State Management**: React Query for server state, local state for UI interactions

### Security Considerations
- **Password Security**: bcrypt with 12 rounds
- **Email Verification**: Required before login
- **Open Registration**: All verified email addresses accepted
- **JWT Tokens**: Include company ID for access control
- **Route Protection**: Middleware handles authentication
- **Board Access Control**: Array-based permission system for board access
- **Role-based Authorization**: USER, CONTRIBUTOR, EDITOR, MEDIA, ADMIN hierarchy

### Common Patterns
- **Error Handling**: Return objects with `success`/`error` properties
- **Form Actions**: Use server actions with FormData
- **Database Queries**: Use Prisma client with proper error handling
- **Email Templates**: React Email components with Resend
- **Type Safety**: Custom Next-Auth types with company ID extension
- **Task Operations**: Server actions for CRUD operations with position management
- **Drag-and-Drop**: @dnd-kit integration for kanban board interactions
- **Error Boundaries**: Component-level error handling for task management

# CRITICAL DATABASE PROTECTION RULES
⚠️ **PRODUCTION DATA PROTECTION - HIGHEST PRIORITY** ⚠️

This system contains LIVE PRODUCTION DATA that must be protected at all costs.

## ABSOLUTE RULES for Database Schema Modifications:

### ✅ SAFE Database Operations (ALWAYS use these):
- `CREATE INDEX CONCURRENTLY` - Creates indexes without locking tables
- `ALTER TABLE ... ADD COLUMN ... DEFAULT ...` - Adds new columns with defaults (non-breaking)
- `CREATE TABLE IF NOT EXISTS` - Creates new tables only if they don't exist
- `ALTER TABLE ... ALTER COLUMN ... SET DEFAULT` - Changes column defaults (safe)
- `UPDATE` statements with `WHERE` clauses - Modifies data safely
- `INSERT INTO ... ON CONFLICT DO NOTHING` - Safe inserts that don't overwrite

### ❌ FORBIDDEN Database Operations (NEVER use these):
- `DROP TABLE` - Deletes entire tables and all data
- `DROP COLUMN` - Removes columns and all their data  
- `TRUNCATE` - Empties tables completely
- `DELETE FROM table_name` without WHERE clause - Deletes all rows
- `ALTER TABLE ... ALTER COLUMN ... TYPE` - Can cause data loss during type conversion
- `CREATE INDEX` without CONCURRENTLY - Locks tables during creation

### 📋 MANDATORY Process for ALL Database Changes:

1. **ALWAYS backup production data first**:
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test migrations locally first**:
   ```bash
   # Create copy of production schema
   npx prisma db pull
   npx prisma generate
   # Test your changes locally
   ```

3. **Use only additive changes**:
   - Add new tables ✅
   - Add new columns with defaults ✅  
   - Add new indexes CONCURRENTLY ✅
   - Never remove or modify existing data structures ❌

4. **Validate data integrity after changes**:
   ```sql
   -- Check row counts match expectations
   SELECT COUNT(*) FROM "Task";
   SELECT COUNT(*) FROM "User";
   SELECT COUNT(*) FROM "Board";
   ```

### 🔄 Safe Migration Pattern:
```sql
-- Example of SAFE migration
BEGIN;

-- Add new column safely
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "embedding_id" TEXT DEFAULT NULL;

-- Create new table safely  
CREATE TABLE IF NOT EXISTS "TaskEmbedding" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT REFERENCES "Task"(id) ON DELETE CASCADE,
  embedding VECTOR(1536),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add index safely (use CONCURRENTLY outside transaction)
COMMIT;

-- Add index with CONCURRENTLY (must be outside transaction)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_embeddings_vector 
ON "TaskEmbedding" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 🚨 Emergency Rollback Plan:
Always have a rollback strategy before making ANY database changes:
```sql
-- Example rollback commands (prepare these BEFORE making changes)
-- DROP INDEX IF EXISTS idx_new_feature;
-- ALTER TABLE "Task" DROP COLUMN IF EXISTS "new_column";
```

### 📝 Documentation Requirements:
Every database change MUST be documented with:
- **Purpose**: Why the change is needed
- **Impact**: Which tables/columns are affected  
- **Safety**: Why the change preserves existing data
- **Rollback**: How to undo the change if needed
- **Testing**: How the change was validated

## ENFORCEMENT:
- Any suggestion to drop, truncate, or destructively modify production tables will be REJECTED
- All database modifications must follow the SAFE patterns above
- Production data integrity is more important than any feature or optimization
- When in doubt, choose the most conservative approach