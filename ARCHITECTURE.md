# NextCRM Architecture Guide

This document provides an in-depth look at the technical architecture and design decisions in NextCRM.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Application Layers](#application-layers)
- [Data Flow](#data-flow)
- [Authentication & Authorization](#authentication--authorization)
- [Database Design](#database-design)
- [File Storage](#file-storage)
- [Real-time Features](#real-time-features)
- [Performance Considerations](#performance-considerations)
- [Security Architecture](#security-architecture)
- [Deployment Architecture](#deployment-architecture)

---

## Architecture Overview

NextCRM follows a modern, modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser / Client                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 15 App Router                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Pages & Routes (with i18n middleware)                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┴──────────────────────┐
        │                                             │
        ▼                                             ▼
┌─────────────────────┐                  ┌──────────────────────┐
│  Server Actions     │                  │  API Routes          │
│  (Data Mutations)   │                  │  (Legacy/External)   │
└─────────────────────┘                  └──────────────────────┘
        │                                             │
        │                                             │
        └─────────────────────┬──────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Prisma Client   │
                    │  (ORM)           │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  MongoDB Atlas   │
                    │  (Database)      │
                    └──────────────────┘
```

---

## Technology Stack

### Frontend Stack
- **Framework:** Next.js 15 with App Router
- **UI Library:** React 19 (RC)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **Form Management:** React Hook Form + Zod validation
- **State Management:** Zustand + Jotai
- **Data Fetching:** SWR, TanStack React Query

### Backend Stack
- **Runtime:** Node.js (via Next.js)
- **Server Functions:** Next.js Server Actions
- **API Pattern:** REST (legacy), primarily Server Actions (modern)
- **Authentication:** NextAuth.js v4
- **Database:** MongoDB Atlas
- **ORM:** Prisma

### External Services
- **Email:** Resend (primary), Nodemailer (SMTP fallback)
- **File Storage:** UploadThing, AWS S3, Digital Ocean Spaces
- **AI:** OpenAI API
- **Knowledge Base:** Notion API
- **Image Processing:** Sharp

---

## Application Layers

### 1. Presentation Layer
**Location:** `app/[locale]/(routes)/`, `components/`

Responsible for:
- Rendering UI components
- Handling user interactions
- Form submission handling
- Client-side validation
- Dark mode support
- Internationalization (i18n)

Key Files:
- Route components in `app/[locale]/(routes)/[module]/page.tsx`
- Components in `components/` directory
- UI primitives in `components/ui/`

### 2. Server Action Layer
**Location:** `actions/`

Responsible for:
- Data mutations and operations
- Server-side validation with Zod
- Authorization checks
- Database operations via Prisma
- External API calls (OpenAI, Notion, etc.)
- Email sending

Pattern:
```typescript
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function createAccount(data: CreateAccountInput) {
  const session = await auth()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  // Validate input
  const validated = CreateAccountSchema.parse(data)

  // Perform operation
  const account = await prisma.crm_Accounts.create({
    data: {
      ...validated,
      createdBy: session.user.id,
    }
  })

  return account
}
```

### 3. API Layer
**Location:** `app/api/`

Used for:
- External integrations (webhooks)
- Legacy API endpoints
- File upload endpoints
- OAuth callbacks

Most modern functionality uses Server Actions instead.

### 4. Database Layer
**Location:** `prisma/schema.prisma`

Handles:
- Data model definitions
- Database constraints
- Relationships between entities
- Indexes for performance
- Seed data

### 5. Utility Layer
**Location:** `lib/`

Provides:
- Client initializations (Prisma, OpenAI, etc.)
- Helper functions
- Constants and configurations
- Type definitions

---

## Data Flow

### Server Action Data Flow
```
User Action (click, submit)
    │
    ▼
React Component
    │
    ▼
Call Server Action
    │
    ▼
Server Action ('use server')
    ├─ Authenticate user (NextAuth)
    ├─ Validate input (Zod)
    ├─ Query/Mutate database (Prisma)
    ├─ Call external APIs if needed
    └─ Return result or error
    │
    ▼
Component receives result
    │
    ▼
Update UI / Display feedback
```

### Example: Creating a Contact
1. **Frontend:** User fills contact form and clicks "Create"
2. **Server Action:** `createContact(formData)` is called
3. **Validation:** Zod schema validates input
4. **Database:** Prisma creates contact in MongoDB
5. **Notification:** Toast notification shown to user
6. **UI Update:** New contact appears in list

---

## Authentication & Authorization

### NextAuth.js Configuration
**File:** `lib/auth.ts`

```typescript
export const authConfig: NextAuthConfig = {
  // Providers: Google, GitHub, Twitter, Email
  // Adapter: Prisma adapter for MongoDB
  // Callbacks: For JWT and session handling
  // Pages: Custom login, error, callback pages
}
```

### Session Management
- Session tokens stored in HTTP-only cookies
- JWT tokens for stateless auth
- Automatic session refresh
- Multiple OAuth providers supported

### Authorization Pattern
```typescript
const session = await auth()

if (!session?.user) {
  throw new Error('Unauthorized')
}

// Access user ID
const userId = session.user.id

// Check role if needed
if (session.user.role !== 'admin') {
  throw new Error('Forbidden')
}
```

### Role-Based Access Control
- **user** - Regular user (default)
- **account_admin** - Account administrator
- **admin** - System administrator

---

## Database Design

### MongoDB + Prisma Architecture
- **Database:** MongoDB Atlas (cloud-hosted)
- **ORM:** Prisma v5 for type-safe database access
- **Schema Definition:** `prisma/schema.prisma`

### Key Data Models

#### User Model
```prisma
model User {
  id            String    @id @default(auto()) @map("_id") @db.ObjectId
  email         String    @unique
  name          String?
  role          String    @default("user")
  accounts      Account[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

#### CRM Models
- `crm_Accounts` - Companies/organizations
- `crm_Contacts` - Individual contacts
- `crm_Leads` - Sales leads
- `crm_Opportunities` - Sales opportunities
- `crm_Contracts` - Contracts
- `crm_Campaigns` - Marketing campaigns
- `crm_Accounts_Tasks` - Account-related tasks

#### Project Models
- `Board` - Project boards
- `Section` - Board columns
- `Task` - Individual tasks

#### Financial Models
- `Invoice` - Invoice records
- `InvoiceItems` - Line items

#### Supporting Models
- `Document` - File storage with polymorphic associations
- `ActivityLog` - Audit trail

### Relationships & Constraints
- Polymorphic associations for documents (linked to multiple entity types)
- Foreign keys with cascading deletes
- Indexes on frequently queried fields
- Unique constraints on email and identifiers

### Data Integrity
- `createdBy` field on all created entities
- `updatedAt` timestamps for audit trails
- Soft deletes where applicable
- Data validation at ORM level via Prisma schema

---

## File Storage

### Multi-Provider Architecture
Supports three storage backends:

#### 1. UploadThing (Primary)
- SaaS solution (recommended)
- Built-in file type validation
- Automatic cleanup
- Integration: `lib/uploadthing.ts`

#### 2. AWS S3
- Traditional cloud storage
- Full control and ownership
- Integration: `lib/digital-ocean-s3.ts` (S3-compatible)
- Presigned URLs for secure access

#### 3. Digital Ocean Spaces
- S3-compatible API
- Cost-effective alternative to AWS
- Same integration as AWS S3

### File Upload Flow
```
User selects file
    │
    ▼
Upload via UploadThing/S3
    │
    ▼
Get file URL
    │
    ▼
Save Document record in database
    │
    ▼
Link to entity (Account, Contact, Invoice, etc.)
```

### Document Linking
Documents can be linked to multiple entities:
- Accounts
- Contacts
- Invoices
- Opportunities
- Contracts
- Tasks

---

## Real-time Features

### Current Real-time Implementation
- **Toast Notifications** - Sonner library for feedback
- **Server Action Updates** - Immediate UI refresh after mutations
- **SWR Auto-refresh** - Data fetching with automatic revalidation

### Notification System
- Task creation/assignment notifications
- Invoice status change notifications
- Project milestone notifications
- Email-based alerts

### Future Real-time Potential
- WebSocket integration for live collaboration
- Presence indicators for multi-user editing
- Real-time notification badges

---

## Performance Considerations

### Frontend Optimization
- **Code Splitting:** App Router automatic code splitting
- **Image Optimization:** Next.js Image component with Sharp
- **CSS Optimization:** Tailwind CSS purging unused styles
- **Component Memoization:** React.memo for expensive components
- **Virtual Scrolling:** For large lists (using PrimeReact components)

### Backend Optimization
- **Database Indexing:** Strategic indexes on frequently queried fields
- **Query Optimization:** Prisma select/include for specific fields
- **Caching:** SWR provides client-side caching
- **Compression:** Gzip/Brotli via Next.js
- **CDN:** Vercel Edge Network for static assets

### Monitoring & Profiling
- Next.js built-in analytics
- Vercel performance metrics
- Chrome DevTools profiling
- Database query logging (development)

---

## Security Architecture

### Input Validation
- **Zod Schemas:** TypeScript-first schema validation
- **Server Action Validation:** All inputs validated on server
- **CSRF Protection:** NextAuth handles CSRF tokens
- **XSS Prevention:** React's built-in XSS protection

### Database Security
- **Prisma Parameterized Queries:** Protection against SQL injection
- **Environment Variables:** Secrets never hardcoded
- **Connection Encryption:** MongoDB Atlas encrypted connections
- **Access Control:** Database user with minimal permissions

### Authentication Security
- **HTTP-only Cookies:** Session tokens in secure cookies
- **Secure Transport:** HTTPS/TLS encryption
- **CSRF Tokens:** Automatic protection via NextAuth
- **Session Expiry:** Configurable session timeout
- **OAuth Security:** Trusted providers (Google, GitHub, Twitter)

### API Security
- **Rate Limiting:** Consider implementing for public endpoints
- **CORS:** Configured appropriately for cross-origin requests
- **Authorization:** Every Server Action checks authentication
- **Logging:** Audit trail of all user actions

### Secrets Management
```env
# Never commit to version control
NEXTAUTH_SECRET=<random-256-bit-string>
DATABASE_URL=<mongodb-connection-string>
OPENAI_API_KEY=<api-key>
```

---

## Deployment Architecture

### Vercel Deployment (Recommended)
```
┌─────────────────────────────────────────┐
│  Git Repository (GitHub)                │
│  ├─ main branch                         │
│  └─ feature branches                    │
└─────────────┬───────────────────────────┘
              │
              │ git push
              ▼
┌─────────────────────────────────────────┐
│  Vercel                                 │
│  ├─ Build: pnpm run build               │
│  │  ├─ Prisma generate                  │
│  │  ├─ Database migration               │
│  │  ├─ Next.js build                    │
│  │  └─ Seed database                    │
│  ├─ Deploy: next start                  │
│  └─ CDN: Vercel Edge Network            │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  MongoDB Atlas                          │
│  (Database)                             │
└─────────────────────────────────────────┘
```

### Self-Hosted Deployment
```
┌──────────────────────────┐
│  Server (Linux/Docker)   │
├──────────────────────────┤
│  Node.js 18+             │
│  pnpm / npm              │
│  Process Manager         │
│  (PM2, systemd, etc)     │
└──────────────────────────┘
```

### Environment-Specific Configuration
```
Development (.env.local)
├─ Local MongoDB
├─ NextAuth dev secrets
└─ UploadThing dev keys

Production (.env.production)
├─ MongoDB Atlas
├─ NextAuth production secrets
└─ AWS S3 / Digital Ocean Spaces
```

---

## Scalability Considerations

### Horizontal Scaling
- **Stateless Design:** App is horizontally scalable
- **Database:** MongoDB Atlas auto-scaling
- **Storage:** S3 multi-region availability
- **CDN:** Vercel global edge network

### Vertical Scaling
- Database query optimization
- Caching strategies
- Image/asset optimization
- Code splitting

### Future Optimization Areas
- Consider Redis for session caching
- Implement job queue (Bull, RabbitMQ) for async tasks
- Add request batching for API calls
- Database read replicas for high-traffic queries

---

## Module Architecture

### Module Pattern
Each major feature follows this structure:

```
feature/
├── page.tsx                 # Main page route
├── layout.tsx              # Feature layout
├── components/             # Feature components
│   ├── list.tsx           # List view
│   ├── detail.tsx         # Detail view
│   ├── form.tsx           # Edit form
│   └── [other].tsx
├── actions.ts             # Server actions
├── hooks.ts               # Custom hooks
└── types.ts               # Type definitions
```

### Cross-Module Communication
- **Shared Types:** `types/` directory
- **Shared Components:** `components/ui/`, `components/form/`
- **Shared Actions:** Common utilities in `lib/`

---

## Error Handling

### Client-Side Error Handling
```typescript
try {
  const result = await createAccountAction(data)
} catch (error) {
  if (error instanceof Error) {
    toast.error(error.message)
  }
}
```

### Server-Side Error Handling
```typescript
export async function createAccount(data: CreateAccountInput) {
  try {
    // Operation
  } catch (error) {
    console.error('Create account failed:', error)
    throw new Error('Failed to create account. Please try again.')
  }
}
```

### Error Monitoring
- Console logging for debugging
- Consider integrating Sentry for production error tracking
- Structured logging for infrastructure logs

---

## Testing Strategy

### E2E Testing
- **Framework:** Cypress
- **Location:** `cypress/` directory
- **Tests:** User workflows and critical paths

### Unit Testing
- Not currently implemented (could use Jest)
- Consider adding for utility functions

### Integration Testing
- Server Actions testing
- Database integration testing

---

## Continuous Integration/Deployment

### GitHub Actions (Recommended Setup)
```yaml
# Automated on push to main
- Run lint
- Build Next.js
- Run tests
- Deploy to Vercel
```

### Pre-commit Hooks
- ESLint validation
- Type checking
- Prettier formatting

---

## Monitoring & Observability

### Current Capabilities
- Vercel built-in analytics
- Database query logs
- Application logs

### Recommended Additions
- Sentry for error tracking
- Datadog for infrastructure monitoring
- Custom analytics for user behavior
- Health check endpoints

---

## Future Architectural Improvements

1. **Event-Driven Architecture**
   - Event bus for domain events
   - Task queue for async operations

2. **Caching Strategy**
   - Redis for session and query caching
   - Cache invalidation patterns

3. **Multi-Tenancy**
   - Current: Single-tenant per deployment
   - Future: SaaS multi-tenant architecture

4. **Real-Time Collaboration**
   - WebSocket support for live editing
   - Operational Transformation for conflict resolution

5. **Microservices**
   - Email service as separate process
   - AI/OpenAI integration as separate service
   - File processing as separate workers

---

## Conclusion

NextCRM's architecture prioritizes:
- **Type Safety** - Full TypeScript implementation
- **Security** - Authentication, validation, encryption
- **Performance** - Optimization at every layer
- **Scalability** - Horizontal and vertical scaling
- **Maintainability** - Clear separation of concerns
- **Developer Experience** - Modern tooling and patterns

For more information, see the [README.md](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md).
