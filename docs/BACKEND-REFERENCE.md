# TaskHQ Backend Reference

This document provides a comprehensive reference for all backend functionality including server actions, API routes, database models, and AI/ML services.

---

## Table of Contents

1. [Server Actions](#server-actions)
2. [API Routes](#api-routes)
3. [Database Models](#database-models)
4. [AI/ML Services](#aiml-services)
5. [Utility Functions](#utility-functions)

---

## Server Actions

Server actions are the primary data mutation layer in TaskHQ. All actions use the `"use server"` directive and are located in the `/actions` directory.

### Authentication Actions

**File:** `/actions/auth-actions.ts`

#### `registerUser(formData: FormData)`

Registers a new user with email verification.

```typescript
// Parameters (from FormData)
email: string      // Required
password: string   // Required
name: string       // Optional

// Returns
{ success: true, user: User, message: string }
| { error: string }

// Flow
1. Validates email/password are provided
2. Checks for existing user
3. Hashes password with bcrypt (12 rounds)
4. Creates user + default company in transaction
5. Sends verification email via Resend
6. Returns success with instructions
```

#### `authenticateUser(formData: FormData)`

Authenticates user with credentials.

```typescript
// Parameters (from FormData)
email: string     // Required
password: string  // Required

// Returns
{ success: true } | { error: string }

// Errors
- "Email and password are required"
- "Please verify your email before signing in"
- "Invalid email or password"
```

#### `signOutUser()`

Signs out the current user.

```typescript
// Returns
Redirects to /auth/signin
```

---

### Company Actions

**File:** `/actions/company-actions.ts`

#### `getUserMemberships()`

Gets all company memberships for current user.

```typescript
// Returns
{
  success: true,
  memberships: CompanyMembership[]
} | { success: false, error: string }
```

#### `switchActiveCompany(companyId: string)`

Switches user's active company context.

```typescript
// Parameters
companyId: string  // Target company ID

// Returns
Redirects to /{companyId}/dashboard
| { success: false, error: string }
```

#### `createCompany(name: string)`

Creates a new company with current user as owner.

```typescript
// Parameters
name: string  // Company name

// Returns
{
  success: true,
  company: Company
} | { success: false, error: string }
```

#### `inviteUserToCompany(companyId: string, email: string, role?: CompanyRole)`

Invites a user to join a company.

```typescript
// Parameters
companyId: string                     // Company to invite to
email: string                         // Email of user to invite
role: "MEMBER" | "ADMIN" = "MEMBER"   // Role to assign

// Requires: ADMIN or OWNER role

// Returns
{
  success: true,
  membership: CompanyMembership
} | { success: false, error: string }
```

#### `removeUserFromCompany(companyId: string, userId: string)`

Removes a user from a company.

```typescript
// Parameters
companyId: string  // Company ID
userId: string     // User to remove

// Requires: ADMIN or OWNER role
// Cannot remove last owner

// Returns
{ success: true } | { success: false, error: string }
```

#### `updateUserRole(companyId: string, userId: string, newRole: CompanyRole)`

Updates a user's role within a company.

```typescript
// Parameters
companyId: string
userId: string
newRole: "MEMBER" | "ADMIN" | "OWNER"

// Requires: OWNER role

// Returns
{
  success: true,
  membership: CompanyMembership
} | { success: false, error: string }
```

#### `getCompanyDetails(companyId: string)`

Gets full company details with members.

```typescript
// Returns
{
  success: true,
  company: Company & { memberships, _count },
  userRole: CompanyRole
} | { success: false, error: string }
```

#### `hasCompanyAccess(companyId: string, requiredRole?: CompanyRole)`

Checks if current user has access to company.

```typescript
// Returns
boolean
```

#### `updateCompanyName(companyId: string, newName: string)`

Updates a company's name.

```typescript
// Parameters
companyId: string
newName: string

// Returns
{ success: true, company: Company }
| { success: false, error: string }
```

---

### User Actions

**File:** `/actions/user.ts`

#### `getUserById(userId: string)`

Gets user by ID.

```typescript
// Returns
User | throws Error("User not found")
```

#### `getUserByEmail(email: string)`

Gets user by email.

```typescript
// Returns
User | throws Error("User not found")
```

#### `getAdmins()`

Gets all admin users.

```typescript
// Returns
User[] | throws Error("Admins not found")
```

---

### Task Actions

**File:** `/actions/tasks/*.ts`

#### `createTask(task: CreateTaskData, boardSectionId: string)`

Creates a new task in a board section.

```typescript
// Parameters
task: {
  title: string
  description: string
  dueDate?: string | Date
  priority?: TaskPriority
  status?: TaskStatusNew
}
boardSectionId: string

// Returns
Task (with assignedTo, createdBy, documents)

// Side Effects
- Triggers embedding update (non-blocking)
- Sets position as last in section
```

#### `editTask(taskId: string, data: EditTaskInput)`

Updates an existing task.

```typescript
// Parameters
taskId: string
data: {
  title?: string
  description?: string | null
  status?: TaskStatusNew
  priority?: TaskPriority
  dueDate?: Date | string | null
  assignedToId?: string
}

// Returns
{ message: "Task updated successfully" }

// Side Effects
- Triggers embedding update (non-blocking)

// ⚠️ SECURITY: Missing authorization check
```

#### `deleteTask(taskId: string)`

Deletes a task and its embeddings.

```typescript
// Parameters
taskId: string

// Returns
void

// Side Effects
- Triggers embedding deletion

// ⚠️ SECURITY: Missing authorization check
```

#### `getTask(taskId: string)`

Gets a single task by ID.

```typescript
// Returns
Task | null
```

#### `getTasks(boardSectionId: string)`

Gets all tasks in a board section.

```typescript
// Returns
Task[]
```

#### `markDone(taskId: string)`

Marks a task as completed.

```typescript
// Returns
Task
```

---

### Board Actions

#### `createBoard(name: string, description?: string, companyId: string)`

Creates a new board.

```typescript
// Returns
Board

// Side Effects
- Adds current user to access list
- Triggers embedding creation
```

#### `editBoard(boardId: string, data: { name?: string, description?: string })`

Updates board details.

```typescript
// Returns
{ message: string }
```

#### `deleteBoard(boardId: string)`

Deletes a board and all its contents.

```typescript
// Returns
{ message: string }

// Cascade Deletes
- All board sections
- All tasks in sections
- Board embeddings

// ⚠️ SECURITY: Missing authorization check
```

#### `getBoard(boardId: string)`

Gets a single board by ID.

```typescript
// Returns
Board | null

// ⚠️ SECURITY: No access control
```

#### `getBoards(userId: string, query?: string, companyId?: string)`

Gets all accessible boards.

```typescript
// Returns
Board[]
```

---

### Board Section Actions

#### `createBoardSection(boardId: string, name: string)`

Creates a new section in a board.

```typescript
// Returns
BoardSection
```

#### `deleteBoardSection(sectionId: string, boardId: string)`

Deletes a board section.

```typescript
// Returns
{ message: string }
```

---

### Position Update Actions

**File:** `/actions/tasks/update-task-position.ts`

#### `updateTaskPosition(taskId: string, newPosition: number)`

Updates a single task's position.

```typescript
// ⚠️ SECURITY: No authorization check
```

#### `updateTaskPositions(updates: TaskPosition[])`

Batch updates task positions.

```typescript
// Parameters
updates: Array<{ id: string, position: number }>
```

#### `moveTaskToTopOfSection(taskId, sourceSectionId, targetSectionId)`

Moves task to top of another section.

```typescript
// Handles
- Position shifting in target section
- Source section cleanup
- Cross-section moves
```

#### `moveTaskBetweenSectionsAtPosition(taskId, sourceSectionId, targetSectionId, targetPosition)`

Moves task to specific position in another section.

---

### Dashboard Actions

**File:** `/actions/dashboard/*.ts`

#### `getTaskMetrics(input: TaskMetricsInput)`

Gets comprehensive task metrics.

```typescript
// Parameters
input: {
  dateRange: "7d" | "30d" | "90d" | "all"
  boardId?: string
  companyId: string
}

// Returns
{
  success: true,
  data: {
    totalTasks: number
    tasksByStatus: { NEW, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED }
    tasksThisWeek: number
    tasksThisMonth: number
    overdueTasks: number
    completionRate: number
    averageCompletionTime: number | null
    trends: { weekOverWeek, monthOverMonth }
  }
}

// Uses withCompanyAccessValidation for security
```

#### `getBoardMetrics(input: BoardMetricsInput)`

Gets comprehensive board metrics.

```typescript
// Returns
{
  success: true,
  data: {
    totalBoards: number
    activeBoardsCount: number
    boardsWithTasks: number
    averageTasksPerBoard: number
    mostActiveBoards: Array<{ id, title, taskCount, sectionCount, lastActivity }>
    boardActivity: { created, updated, archived }
    sectionDistribution: { totalSections, averageSectionsPerBoard, sectionUtilization }
    trends: { weekOverWeek, monthOverMonth }
  }
}
```

#### `getDashboardOverview(companyId: string)`

Gets dashboard overview data.

#### `getUserMetrics(companyId: string)`

Gets user-related metrics.

#### `getTaskTableData(input: TableDataInput)`

Gets paginated task data for tables.

---

### Chart Actions

**File:** `/actions/dashboard/charts/*.ts`

#### `getDistributionData(companyId: string)`

Gets task distribution data for charts.

#### `getTaskTimelineData(companyId: string, dateRange: string)`

Gets task timeline data for line charts.

---

### Mail Actions

**File:** `/actions/mail/*.ts`

#### `getMailAccounts()`

Gets user's configured mail accounts.

#### `createMailAccount(data: MailAccountData)`

Creates a new mail account configuration.

#### `sendEmail(to: string, subject: string, body: string)`

Sends an email using configured SMTP.

---

### AI Board Actions

**File:** `/actions/tasks/create-board-from-ai.ts`

#### `createBoardFromAI(prompt: string, companyId: string)`

Creates a board using AI generation.

```typescript
// Returns
{
  requestId: string
  status: AIBoardRequestStatus
}
```

#### `retryBoardGeneration(requestId: string)`

Retries a failed AI board generation.

---

## API Routes

### Authentication Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| * | `/api/auth/[...nextauth]` | Next-Auth handler routes |
| POST | `/api/auth/force-logout` | Force logout endpoint |
| GET | `/api/verify-email` | Email verification callback |

### Company Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/company/validate-access` | Validates company access |

### AI Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/chat` | AI chat completion (v1) |
| POST | `/api/ai/chat-v2` | Enhanced AI chat with tools |
| POST | `/api/ai/suggest` | AI task suggestions |
| POST | `/api/ai/embeddings` | Generate vector embeddings |
| POST | `/api/ai/documents` | Upload and process documents |
| GET | `/api/ai/documents?action=search` | Search documents |
| GET | `/api/ai/documents?action=stats` | Get document stats |
| POST | `/api/ai/analyze` | Analyze document content |
| GET | `/api/ai/metrics` | Get AI usage metrics |
| DELETE | `/api/ai/privacy` | GDPR data deletion |
| POST | `/api/ai/agents` | AI agent invocation |
| GET | `/api/ai/agents/metrics` | Agent metrics |

### Health Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health/ai` | AI system health check |
| GET | `/api/health/mcp` | MCP system health check |

### MCP Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| * | `/api/mcp/[transport]` | MCP transport handler |
| GET | `/api/mcp/tasks/sse` | Task operations via SSE |
| GET | `/api/mcp/boards/sse` | Board operations via SSE |
| GET | `/api/mcp/search/sse` | Search via SSE |
| GET | `/api/mcp/analytics/sse` | Analytics via SSE |

---

## Database Models

### Core Models

#### User

```prisma
model User {
  id                     String     @id @default(cuid())
  name                   String?
  email                  String     @unique
  emailVerified          DateTime?
  emailVerificationToken String?    @unique
  emailTokenExpires      DateTime?
  image                  String?
  password               String?
  company_id             String?
  role                   UserRole   @default(USER)
  createdAt              DateTime   @default(now())
  updatedAt              DateTime   @updatedAt

  // Relations
  accounts               Account[]
  sessions               Session[]
  assignedTasks          Task[]     @relation("AssignedTasks")
  createdTasks           Task[]     @relation("CreatedTasks")
  aiConversations        AIConversation[]
  aiBoardRequests        AIGeneratedBoardRequest[]
  memberships            CompanyMembership[]
  documents              Document[]
  securityAuditLogs      SecurityAuditLog[]
  mailAccounts           UserMailAccount[]
}

enum UserRole {
  USER        // Basic access
  CONTRIBUTOR // Can create tasks
  EDITOR      // Can edit tasks
  MEDIA       // Can manage documents
  ADMIN       // Full access
}
```

#### Company

```prisma
model Company {
  id          String   @id @default(cuid())
  name        String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  boards                  Board[]
  memberships             CompanyMembership[]
  AIGeneratedBoardRequest AIGeneratedBoardRequest[]
}
```

#### CompanyMembership

```prisma
model CompanyMembership {
  companyId String
  userId    String
  role      CompanyRole @default(MEMBER)
  createdAt DateTime    @default(now())

  company   Company @relation(...)
  user      User    @relation(...)

  @@id([companyId, userId])
}

enum CompanyRole {
  MEMBER  // Basic access
  ADMIN   // Can manage members
  OWNER   // Full control
}
```

#### Board

```prisma
model Board {
  id            String         @id @default(cuid())
  name          String
  description   String?
  createdBy     String
  access        String[]       // User IDs with access
  companyId     String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  // Relations
  company       Company?       @relation(...)
  boardSections BoardSection[]
  embedding     BoardEmbedding?
  documents     Document[]
  aiRequests    AIGeneratedBoardRequest[]
}
```

#### BoardSection

```prisma
model BoardSection {
  id        String   @id @default(cuid())
  name      String
  position  Int      @default(0)
  boardId   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  board     Board    @relation(...)
  tasks     Task[]
}
```

#### Task

```prisma
model Task {
  id             String         @id @default(cuid())
  title          String
  description    String
  priority       TaskPriority   @default(MEDIUM)
  status         TaskStatusNew  @default(NEW)
  dueDate        DateTime
  position       Int            @default(0)
  assignedToId   String
  createdById    String
  boardSectionId String
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  // Relations
  assignedTo     User           @relation("AssignedTasks", ...)
  createdBy      User           @relation("CreatedTasks", ...)
  boardSection   BoardSection   @relation(...)
  history        TaskHistory[]
  documents      Document[]
  embedding      TaskEmbedding?
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

### AI/ML Models

#### TaskEmbedding

```prisma
model TaskEmbedding {
  id        String                @id @default(cuid())
  taskId    String                @unique
  embedding Unsupported("vector") // pgvector 1536 dimensions
  content   String                // Text used for embedding
  metadata  Json                  // Additional metadata
  createdAt DateTime              @default(now())
  updatedAt DateTime              @updatedAt

  task      Task                  @relation(...)
}
```

#### BoardEmbedding

```prisma
model BoardEmbedding {
  id        String                @id @default(cuid())
  boardId   String                @unique
  embedding Unsupported("vector")
  content   String
  metadata  Json
  createdAt DateTime              @default(now())
  updatedAt DateTime              @updatedAt

  board     Board                 @relation(...)
}
```

#### AIConversation

```prisma
model AIConversation {
  id        String               @id @default(cuid())
  userId    String
  companyId String
  title     String?
  context   Json?
  createdAt DateTime             @default(now())
  updatedAt DateTime             @updatedAt

  // Relations
  user      User                 @relation(...)
  messages  AIMessage[]
  summary   ConversationSummary?
}
```

#### AIMessage

```prisma
model AIMessage {
  id             String         @id @default(cuid())
  conversationId String
  role           String         // "user" | "assistant" | "system"
  content        String
  metadata       Json?
  createdAt      DateTime       @default(now())

  conversation   AIConversation @relation(...)
}
```

#### Document

```prisma
model Document {
  id            String              @id @default(cuid())
  filename      String
  mimeType      String
  size          Int
  extractedText String
  summary       String
  keyInsights   String[]
  confidence    Float
  uploadedBy    String
  companyId     String
  taskId        String?
  boardId       String?
  processedAt   DateTime            @default(now())
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  // Relations
  user          User                @relation(...)
  task          Task?               @relation(...)
  board         Board?              @relation(...)
  embeddings    DocumentEmbedding[]
}
```

### Security Models

#### SecurityAuditLog

```prisma
model SecurityAuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String
  resource  String
  details   Json
  timestamp DateTime
  ipAddress String?
  userAgent String?
  risk      String   // "low" | "medium" | "high"
  createdAt DateTime @default(now())

  user      User     @relation(...)
}
```

---

## AI/ML Services

### EmbeddingService

**File:** `/lib/ai/embedding-service.ts`

Handles vector embedding generation using OpenAI.

```typescript
class EmbeddingService {
  // Generate single embedding
  async generateEmbedding(content: string): Promise<number[]>

  // Generate batch embeddings
  async generateEmbeddings(contents: string[]): Promise<number[][]>

  // Clear embedding cache
  clearCache(): void

  // Get cache statistics
  getCacheStats(): { size: number; hitRate: number }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; error?: string }>
}

// Singleton instance
export const embeddingService = EmbeddingService.getInstance();
```

**Configuration:**
- Model: `text-embedding-3-small`
- Dimensions: 1536
- Cache: In-memory with content hashing
- Max Content Length: Configurable via `aiConfig`

---

### VectorSearchService

**File:** `/lib/ai/vector-search.ts`

Handles semantic search using pgvector.

```typescript
class VectorSearchService {
  // Semantic task search
  async searchTasks(query: VectorSearchQuery): Promise<VectorSearchResult[]>

  // Hybrid search (vector + keyword)
  async hybridSearch(
    query: VectorSearchQuery,
    vectorWeight?: number,  // Default: 0.7
    keywordWeight?: number  // Default: 0.3
  ): Promise<VectorSearchResult[]>

  // Find similar tasks
  async findSimilarTasks(taskId: string, limit?: number): Promise<VectorSearchResult[]>

  // Find similar boards with company filtering
  async findSimilarBoardsTyped(
    queryEmbedding: number[],
    companyId: string,
    limit?: number
  ): Promise<BoardSearchResult[]>

  // Find similar tasks with company filtering
  async findSimilarTasksTyped(
    queryEmbedding: number[],
    companyId: string,
    limit?: number
  ): Promise<TaskSearchResult[]>

  // Health check
  async healthCheck(): Promise<{
    healthy: boolean
    vectorSearchEnabled: boolean
    error?: string
  }>
}

interface VectorSearchQuery {
  query: string
  companyId: string
  userId: string
  threshold?: number  // Default: 0.7
  limit?: number      // Default: 10
  filters?: {
    boardIds?: string[]
    priority?: string[]
    status?: string[]
    assigneeIds?: string[]
    dateRange?: { start: Date; end: Date }
  }
}
```

---

### AISecurityService

**File:** `/lib/security/ai-security.ts`

Handles rate limiting, permissions, and security for AI operations.

```typescript
class AISecurityService {
  // Check rate limits
  async checkRateLimit(
    userId: string,
    operation: string,
    request?: NextRequest
  ): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
    retryAfter?: number
  }>

  // Log security events
  async logSecurityEvent(event: SecurityAuditLog): Promise<void>

  // Validate and sanitize AI input
  validateAIInput(
    input: string,
    maxLength?: number
  ): {
    isValid: boolean
    sanitized: string
    warnings: string[]
  }

  // Check AI operation permissions
  async checkAIPermissions(
    userId: string,
    operation: string,
    resourceId?: string
  ): Promise<{ allowed: boolean; reason?: string }>

  // Anonymize user data (GDPR)
  async anonymizeUserData(userId: string): Promise<void>

  // Delete user AI data (GDPR)
  async deleteUserAIData(userId: string): Promise<void>

  // Get security metrics
  async getSecurityMetrics(
    timeRange: "hour" | "day" | "week"
  ): Promise<SecurityMetrics>
}

// Rate Limit Configurations
{
  "ai-chat": { windowMs: 60000, maxRequests: 30 },
  "ai-suggestions": { windowMs: 300000, maxRequests: 20 },
  "ai-analysis": { windowMs: 900000, maxRequests: 10 },
  "document-processing": { windowMs: 3600000, maxRequests: 50 }
}
```

---

### Company Access Validator

**File:** `/lib/security/company-access-validator.ts`

Validates multi-tenant access.

```typescript
// Validate company access
async function validateCompanyAccess(
  userId: string,
  companyId: string,
  resourceType: "task" | "board" | "document" | "ai_query",
  resourceId?: string,
  action?: string
): Promise<AccessValidationResult>

// Wrapper for server actions with validation
async function withCompanyAccessValidation<T>(
  userId: string,
  companyId: string,
  resourceType: string,
  action: string,
  operation: () => Promise<T>
): Promise<{ success: boolean; data?: T; error?: string }>
```

---

## Utility Functions

### Database Connection

**File:** `/lib/db.ts`

```typescript
// Prisma client singleton
const db = globalThis.prisma ?? new PrismaClient();
export default db;
```

### Email Verification

**File:** `/lib/email-verification.ts`

```typescript
// Generate verification token
function generateVerificationToken(): string

// Create verification URL
function createVerificationUrl(token: string): string
```

**File:** `/lib/send-verification-email.ts`

```typescript
// Send verification email
async function sendVerificationEmail(
  email: string,
  name?: string
): Promise<{ success: boolean; error?: string }>
```

### Embedding Triggers

**File:** `/lib/ai/embedding-triggers.ts`

```typescript
// Trigger task embedding update
async function triggerTaskEmbeddingUpdate(taskId: string): Promise<void>

// Trigger task embedding deletion
async function triggerTaskEmbeddingDeletion(taskId: string): Promise<void>

// Trigger board embedding update
async function triggerBoardEmbeddingUpdate(boardId: string): Promise<void>

// Trigger board embedding deletion
async function triggerBoardEmbeddingDeletion(boardId: string): Promise<void>
```

### General Utilities

**File:** `/lib/utils.ts`

```typescript
// Tailwind class merger
function cn(...inputs: ClassValue[]): string

// Format date
function formatDate(date: Date): string

// Generate CUID
function generateId(): string
```

---

## Error Handling Patterns

### Server Action Pattern

```typescript
// Consistent return shape
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// Example implementation
export async function myAction(input: Input): Promise<ActionResult<Output>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validated = Schema.parse(input);

    // Execute operation
    const result = await operation(validated);

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: "Validation failed" };
    }
    console.error("Action error:", error);
    return { success: false, error: "Operation failed" };
  }
}
```

### API Route Pattern

```typescript
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = Schema.parse(body);

    const result = await operation(validated);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

---

*Last Updated: January 2026*
*Document Version: 1.0*
