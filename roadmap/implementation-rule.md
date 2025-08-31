# RAG Implementation Rules for TaskHQ

## Development Guidelines for Claude Code AI Agent - TaskHQ Project

### Build & Quality Verification

1. **After completing ANY phase development work:**
   - Run `pnpm build` and fix ALL compilation errors until build succeeds
   - Run `pnpm lint` and fix ALL ESLint warnings/errors
   - Re-run `pnpm build` after lint fixes to ensure everything still compiles
   - Only mark phase as complete when both build and lint pass without issues

### Database Connection Rules

- **ALWAYS use existing centralized database connection**: `import db from '@/lib/db'`
- **NEVER instantiate new PrismaClient()** - this will cause connection pool issues
- **Use custom Prisma client path**: Import from `@/lib/generated/prisma/` (as per TaskHQ config)
- **Follow existing patterns** from current codebase for database operations
- **Use transactions** for operations that modify multiple tables
- **All database queries MUST filter by company ID (`cid`)** for proper data isolation
- **Use indexed fields** for optimized queries (especially on `cid` and `emailVerificationToken`)

### Code Quality Standards

- **Follow existing code conventions** in the codebase
- **Use TypeScript strictly** - no `any` types without justification
- **Implement proper error handling** with try/catch blocks
- **Add input validation** using Zod schemas for all user inputs
- **Include JSDoc comments** for complex functions and server actions

### File Organization (TaskHQ Specific)

- **Place server actions** in `/actions/` directory with `"use server"` directive
  - AI-related actions go in `/actions/ai/` subdirectory
  - Follow existing patterns: `/actions/tasks/`, `/actions/users/`
- **Place UI components** in `/components/` with appropriate subdirectories
  - AI components in `/components/ai/` subdirectory
  - Use existing shadcn/ui components (New York style, neutral base color)
- **Place utility functions** in `/lib/` directory
  - AI utilities in `/lib/ai/` subdirectory
  - Database utilities use existing `/lib/db.ts` connection
- **Place types/interfaces** in `/types/` directory or inline with usage
- **Follow existing naming conventions** for files and functions
- **API routes** follow Next.js 15 App Router structure in `/app/api/`
- **Protected routes** use company-specific structure: `/app/(app)/[cid]/`

### Security Requirements (TaskHQ Specific)

- **Every server action** must validate session using `auth()` from Next-Auth v5
- **Every database query** must filter by `cid` (company ID) for data isolation
- **Validate all inputs** before processing with Zod schemas
- **Use prepared statements** to prevent SQL injection (Prisma handles this)
- **Log sensitive operations** for audit trails
- **AI Operations Security**:
  - Validate and sanitize all AI inputs (max 4000 chars)
  - Implement rate limiting for AI endpoints
  - Filter sensitive information before sending to AI models
  - Log all AI operations with user context and company ID
- **Role-based Access Control**: Respect USER, CONTRIBUTOR, EDITOR, MEDIA, ADMIN hierarchy
- **Board Access Control**: Check user access arrays for board-specific operations
- **Email Verification**: Required before AI features access

### Testing Requirements

- **Write unit tests** for utility functions and complex logic
- **Test permission checks** for all roles and scenarios
- **Test error conditions** and edge cases
- **Verify data isolation** between companies in tests
- **Test backward compatibility** with existing data

### Phase Completion Documentation

After successfully completing each phase:

1. **Create phase resume document**: `phase[X]-dev-resume.md` in the same directory
2. **Include in the resume:**
   - What was implemented (features, components, actions)
   - Files created/modified with brief descriptions
   - Database changes made (models, migrations, indexes)
   - Testing completed and results
   - Known issues or limitations
   - Next phase dependencies or recommendations
3. **Update main README.md** to reflect completion status

### Migration Safety Rules (TaskHQ Database)

- **Always backup database** before running migrations
- **Test migrations** on development data first
- **Use transactions** for complex migration operations
- **Verify data integrity** after migrations
- **Have rollback procedures** ready for each migration
- **RAG-Specific Migrations**:
  - Add pgvector extension carefully (`CREATE EXTENSION IF NOT EXISTS vector`)
  - Test vector operations before production deployment
  - Ensure embedding dimensions match AI model (1536 for text-embedding-ada-002)
  - Index vector columns appropriately for performance
- **Use Prisma migration commands**: `npx prisma generate` then `npx prisma db push`

### Performance Considerations (TaskHQ + RAG)

- **Add database indexes** for queries filtering by `cid` (company ID)
- **Use pagination** for large data sets
- **Implement caching** where appropriate
- **Monitor query performance** and optimize slow queries
- **Consider connection pooling** impacts of new queries
- **RAG-Specific Performance**:
  - Cache embedding results to reduce OpenAI API calls
  - Implement batch processing for embedding generation
  - Use connection pooling for MCP server connections
  - Optimize vector similarity searches with appropriate thresholds
  - Stream AI responses using Vercel AI SDK for better UX
  - Implement rate limiting to prevent API quota exhaustion

### UI/UX Standards (TaskHQ Design System)

- **Follow existing design patterns** and component structure
- **Use shadcn/ui components** (New York style, neutral base color, CSS variables)
- **Ensure responsive design** for mobile and desktop
- **Add loading states** for async operations
- **Implement error boundaries** for component error handling
- **Maintain accessibility** standards (ARIA labels, keyboard navigation)
- **TaskHQ-Specific UI**:
  - Use Geist font family (sans and mono variants)
  - Follow Tailwind CSS v4 patterns with CSS variables
  - Use Lucide React icons and @tabler/icons-react consistently
  - Integrate with existing kanban drag-and-drop using @dnd-kit
  - Maintain company-specific routing (`/[cid]/`) in navigation
- **AI Component Guidelines**:
  - Provide clear loading states for AI operations
  - Show confidence scores and sources for AI responses
  - Implement streaming UI for real-time AI responses
  - Add fallback states when AI services are unavailable

### Version Control

- **Make atomic commits** for each logical change
- **Write clear commit messages** following existing patterns
- **Create feature branches** for each phase development
- **Test thoroughly** before merging to main branch

### Error Handling Patterns (TaskHQ + RAG)

```typescript
// TaskHQ Server Actions Pattern with RAG Integration
"use server"
import { auth } from "@/auth"
import db from "@/lib/db"
import { z } from "zod"
import { revalidatePath } from "next/cache"

export async function aiActionName(formData: FormData) {
  try {
    // Session validation (TaskHQ pattern)
    const session = await auth()
    if (!session?.user) {
      return { error: 'Authentication required' }
    }

    // Input validation
    const data = ValidationSchema.parse({...})

    // Company data isolation check
    const companyId = session.user.cid
    if (!companyId) {
      return { error: 'Company context required' }
    }

    // Business logic with company filtering
    const result = await db.model.create({
      data: {
        ...data,
        companyId, // Always include company ID
        userId: session.user.id
      }
    })

    // Trigger AI embedding update if needed
    if (result.id) {
      await triggerEmbeddingUpdate(result.id).catch(console.error)
    }

    // Revalidate cache
    revalidatePath(`/${companyId}/tasks`)

    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('AI Action error:', error)
    return { error: 'Operation failed' }
  }
}
```

### Component Error Boundary Pattern (TaskHQ + AI)

```typescript
// AI Component with TaskHQ error handling
"use client"
import { useChat } from 'ai/react'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export function AIComponentName({ boardId }: { boardId?: string }) {
  const { data: session } = useSession()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Vercel AI SDK integration
  const { messages, input, handleInputChange, handleSubmit, isLoading: aiLoading } = useChat({
    api: '/api/ai/chat',
    body: { boardId, companyId: session?.user?.cid },
    onError: (error) => {
      console.error('AI Chat error:', error)
      setError('AI service temporarily unavailable')
    }
  })

  // Session validation
  useEffect(() => {
    if (!session?.user?.emailVerified) {
      setError('Email verification required for AI features')
    }
  }, [session])

  // Cleanup and error reset
  useEffect(() => {
    return () => {
      setError(null)
    }
  }, [])

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded">
        <p className="text-red-800">{error}</p>
        <button onClick={() => setError(null)}>Retry</button>
      </div>
    )
  }

  // Component implementation with loading states
}
```

## Phase Implementation Checklist (TaskHQ RAG Project)

Before marking any phase as complete, verify:

- [ ] All TypeScript compilation errors resolved (`pnpm build` passes)
- [ ] All ESLint warnings/errors fixed (`pnpm lint` passes)
- [ ] Database connection uses centralized `db` import from `@/lib/db`
- [ ] All server actions validate session with `auth()` from Next-Auth v5
- [ ] All database queries filter by `cid` (company ID) for data isolation
- [ ] All inputs are validated with Zod schemas
- [ ] Error handling follows established patterns with proper fallbacks
- [ ] UI components use shadcn/ui (New York style) and are responsive
- [ ] Email verification is checked before AI features access
- [ ] Tests written and passing for new functionality
- [ ] Phase resume document created
- [ ] Code follows existing conventions and style
- [ ] **RAG-Specific Checks**:
  - [ ] Vector database operations use proper embedding dimensions (1536)
  - [ ] MCP servers are properly initialized and health-checked
  - [ ] AI operations implement rate limiting and cost controls
  - [ ] Embedding generation includes company context isolation
  - [ ] AI responses include confidence scores and source citations
  - [ ] Vercel AI SDK hooks used correctly for streaming responses
  - [ ] OpenAI API keys and secrets properly configured
  - [ ] Vector similarity searches have appropriate thresholds
  - [ ] Conversation memory respects user privacy settings
  - [ ] Production monitoring and alerting configured

## Implementation Priority Order (TaskHQ RAG Project)

1. **Database schema changes** (migrations, models, pgvector setup)
2. **MCP server infrastructure** (connection pooling, health checks)
3. **AI service foundations** (embedding generation, vector search)
4. **Server actions** (business logic, validation, AI integration)
5. **AI agent architecture** (orchestration, specialized agents)
6. **API endpoints** (streaming, rate limiting, error handling)
7. **UI components** (chat interfaces, suggestions, analytics)
8. **Integration & testing** (connecting components to AI services)
9. **Production optimization** (monitoring, security, performance)
10. **Documentation** (phase resume, deployment guides, troubleshooting)

## TaskHQ-Specific Environment Variables Required

```env
# Existing TaskHQ variables
DATABASE_URL="postgresql://username:password@localhost:5432/taskhq"
AUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
RESEND_API_KEY="your-resend-api-key"

# New RAG Implementation variables
OPENAI_API_KEY="sk-..."
AI_MODEL="gpt-4-turbo"
EMBEDDING_MODEL="text-embedding-ada-002"
REDIS_URL="redis://localhost:6379"
MCP_SSE_ENABLED="true"
AI_FEATURES_ENABLED="true"
PGVECTOR_ENABLED="true"
AI_RATE_LIMIT_REQUESTS="100"
AI_RATE_LIMIT_WINDOW="3600"
```
