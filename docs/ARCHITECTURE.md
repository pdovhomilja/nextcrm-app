# NextCRM → AWMS System Architecture

**Version:** 2.0.0
**Last Updated:** November 4, 2025
**Status:** Production Ready (SaaS Transformation Complete)
**Target Market:** Australia and New Zealand Automotive Workshops

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [System Overview](#system-overview)
- [Core Components](#core-components)
- [AWMS Feature Mapping](#awms-feature-mapping)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Security Layers](#security-layers)
- [Multi-Tenancy Design](#multi-tenancy-design)
- [Performance Characteristics](#performance-characteristics)
- [Deployment Architecture](#deployment-architecture)
- [Monitoring & Observability](#monitoring--observability)
- [Disaster Recovery](#disaster-recovery)
- [Future Enhancements](#future-enhancements)

---

## Executive Summary

### System Purpose

NextCRM is a modern, multi-tenant Customer Relationship Management system built with Next.js 15, TypeScript, Prisma, and MongoDB. It serves as the foundation for **AWMS (Automotive Workshop Management System)**, targeting small to enterprise-level automotive workshops in Australia and New Zealand.

### Key Capabilities for Automotive Workshops

- **Customer & Vehicle Management**: Track customers, vehicles, service history
- **Service Order Management**: Digital workflow from inquiry to completed repair
- **Parts Inventory**: Real-time stock tracking with supplier integration roadmap
- **Scheduling & Dispatching**: Bay allocation, technician assignments, labor tracking
- **Invoicing & Payments**: Automotive-compliant invoicing with GST (AU/NZ)
- **Compliance Tracking**: Service certifications, safety inspections, emission testing
- **Multi-Location Support**: Franchise and chain workshop management

### Technology Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                               │
│  - Next.js 15 (App Router + Server Components)                  │
│  - React 18 (UI Framework)                                       │
│  - shadcn/ui (Component Library)                                 │
│  - Tailwind CSS (Styling)                                        │
│  - Zustand (Client State)                                        │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       APPLICATION TIER                           │
│  - Next.js API Routes (RESTful APIs)                            │
│  - Server Actions (Type-safe mutations)                         │
│  - NextAuth.js (Authentication)                                  │
│  - RBAC Middleware (Authorization)                              │
│  - Rate Limiting Layer (DDoS Protection)                        │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATA TIER                                │
│  - MongoDB (Primary Database)                                    │
│  - Prisma ORM (Type-safe queries)                               │
│  - UploadThing / DO Spaces (File Storage)                       │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INTEGRATION TIER                            │
│  - Stripe (Billing & Subscriptions)                             │
│  - Resend (Transactional Email)                                 │
│  - OpenAI (AI Features)                                         │
│  - Rossum (Invoice OCR/Parsing)                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Deployment Architecture

- **Hosting**: Vercel (serverless edge functions)
- **Database**: MongoDB Atlas (multi-region replication)
- **CDN**: Vercel Edge Network (global low-latency)
- **File Storage**: DigitalOcean Spaces (S3-compatible)
- **Email**: Resend API (transactional) + IMAP/SMTP (inbox)
- **Payments**: Stripe Checkout + Customer Portal

---

## System Overview

### High-Level Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT BROWSER                                │
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Workshop UI  │  │ Customer UI  │  │  Admin UI    │                  │
│  │ (Dashboard)  │  │  (Portal)    │  │  (Settings)  │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                  │                  │                           │
└─────────┼──────────────────┼──────────────────┼───────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS APP ROUTER                               │
│                                                                           │
│  /api/crm/*        /api/projects/*      /api/invoice/*                  │
│  /api/billing/*    /api/organization/*  /api/documents/*                │
│                                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                     MIDDLEWARE LAYER                               │ │
│  │  - Rate Limiting (Plan-based DDoS protection)                     │ │
│  │  - RBAC Enforcement (Permission checking)                         │ │
│  │  - Session Validation (NextAuth)                                  │ │
│  │  - Audit Logging (Security trail)                                 │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                  SERVER ACTIONS LAYER                              │ │
│  │  - Type-safe mutations (React Server Components)                  │ │
│  │  - Multi-tenancy isolation (organizationId filter)                │ │
│  │  - Permission enforcement (checkWritePermission)                  │ │
│  │  - Audit logging (all CREATE/UPDATE/DELETE)                       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATABASE LAYER                                  │
│                                                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │  Organizations  │  │  Users (RBAC)   │  │  Audit Logs     │        │
│  │  - Multi-tenant │  │  - 4 Roles      │  │  - Compliance   │        │
│  │  - Subscriptions│  │  - Permissions  │  │  - Forensics    │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│                                                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │  CRM Entities   │  │  Projects       │  │  Invoices       │        │
│  │  - Accounts     │  │  - Boards       │  │  - Documents    │        │
│  │  - Contacts     │  │  - Tasks        │  │  - Payments     │        │
│  │  - Leads        │  │  - Sections     │  │                 │        │
│  │  - Opportunities│  │                 │  │                 │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│                                                                           │
│                    MongoDB (Prisma ORM)                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Frontend Architecture

#### Next.js 15 App Router Structure

```
app/
├── [locale]/                      # Internationalization (en, de, cz, uk)
│   ├── (auth)/                    # Authentication routes (public)
│   │   ├── sign-in/
│   │   ├── register/
│   │   ├── accept-invitation/[token]/
│   │   └── onboarding/            # New user setup
│   │
│   └── (routes)/                  # Protected application routes
│       ├── page.tsx               # Dashboard home
│       ├── layout.tsx             # Authenticated layout
│       │
│       ├── crm/                   # CRM module
│       │   ├── accounts/          # Workshop locations (AWMS)
│       │   ├── contacts/          # Customers + Staff (AWMS)
│       │   ├── leads/             # Service inquiries (AWMS)
│       │   └── opportunities/     # Service orders (AWMS)
│       │
│       ├── projects/              # Task management (AWMS: repair jobs)
│       │   ├── [boardId]/
│       │   └── components/
│       │
│       ├── invoice/               # Invoicing (AWMS: billing)
│       ├── documents/             # File storage (AWMS: vehicle records)
│       ├── reports/               # Analytics
│       │
│       └── settings/              # User & org settings
│           ├── profile/
│           ├── team/
│           ├── organization/
│           ├── billing/
│           └── usage/
```

#### Component Organization

**UI Components** (`components/ui/`):
- Built with Radix UI primitives + shadcn/ui patterns
- Fully accessible (WCAG 2.1 AA compliant)
- Tailwind CSS styling with design tokens
- Dark mode support (next-themes)

**Feature Components**:
- Co-located with routes where possible
- Reusable data tables (@tanstack/react-table)
- Form components (React Hook Form + Zod)
- Modal/Sheet patterns for actions

**State Management**:
- **Server State**: React Server Components (default)
- **Client State**: Zustand (global, persistent)
- **Form State**: React Hook Form (local, ephemeral)
- **URL State**: Next.js searchParams (shareable)

---

### 2. Backend Architecture

#### API Route Organization

```
app/api/
├── crm/                           # CRM endpoints
│   ├── account/
│   │   ├── route.ts               # GET (list), POST (create)
│   │   └── [accountId]/
│   │       ├── route.ts           # GET (read), PUT (update), DELETE
│   │       ├── task/create/route.ts
│   │       ├── watch/route.ts
│   │       └── unwatch/route.ts
│   │
│   ├── contacts/route.ts          # CRUD for contacts
│   ├── leads/route.ts             # CRUD for leads
│   └── opportunity/route.ts       # CRUD for opportunities
│
├── projects/                      # Project management
│   ├── route.ts                   # List/Create boards
│   ├── [projectId]/route.ts       # Board operations
│   ├── sections/                  # Kanban sections
│   └── tasks/                     # Task management
│
├── billing/                       # Stripe integration
│   ├── create-checkout-session/
│   ├── create-portal-session/
│   └── subscription/
│
├── organization/                  # Multi-tenancy management
│   ├── route.ts                   # Org CRUD
│   ├── members/                   # Team management
│   ├── invitations/               # Invite workflow
│   ├── export-data/               # GDPR compliance
│   ├── delete/                    # Org deletion (30-day grace)
│   └── audit-logs/                # Security audit trail
│
├── webhooks/
│   └── stripe/route.ts            # Stripe event handling
│
└── uploadthing/
    └── core.ts                    # File upload handlers
```

#### Server Actions Pattern

```typescript
// actions/crm/get-accounts.ts
"use server";

export async function getAccounts(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized");
  }

  // Multi-tenancy isolation
  const accounts = await prismadb.crm_Accounts.findMany({
    where: {
      organizationId: session.user.organizationId, // ← KEY: Tenant isolation
    },
    include: {
      assigned_to_user: true,
      assigned_documents: true,
    },
  });

  return accounts;
}
```

**Server Actions Benefits**:
- Type-safe client-server communication
- Automatic serialization (no manual JSON parsing)
- Server-only code (sensitive logic never exposed)
- Integrated with React 18 Suspense/Streaming

---

### 3. Database Architecture

#### MongoDB Schema Design (Prisma ORM)

```prisma
// Core Multi-Tenancy Model
model Organizations {
  id               String             @id @default(auto()) @map("_id") @db.ObjectId
  name             String
  slug             String             @unique
  plan             OrganizationPlan   @default(FREE)    // FREE | PRO | ENTERPRISE
  status           OrganizationStatus @default(ACTIVE)  // ACTIVE | SUSPENDED | CANCELLED
  ownerId          String             @db.ObjectId
  stripeCustomerId String?            @unique
  createdAt        DateTime           @default(now())
  updatedAt        DateTime?          @updatedAt

  // Relations (1 organization : many resources)
  users            Users[]            @relation("user_organizations")
  crm_accounts     crm_Accounts[]
  crm_leads        crm_Leads[]
  crm_contacts     crm_Contacts[]
  invoices         Invoices[]
  documents        Documents[]
  tasks            Tasks[]
  boards           Boards[]
  auditLogs        AuditLog[]
}

// User Model with RBAC
model Users {
  id                  String            @id @default(auto()) @map("_id") @db.ObjectId
  email               String            @unique
  password            String?
  name                String?
  avatar              String?
  userStatus          ActiveStatus      @default(PENDING)  // PENDING | ACTIVE | INACTIVE

  // Multi-tenancy fields
  organizationId      String?           @db.ObjectId
  organization_role   OrganizationRole  @default(MEMBER)   // VIEWER | MEMBER | ADMIN | OWNER

  organization        Organizations?    @relation("user_organizations", fields: [organizationId])
  owned_organizations Organizations[]   @relation("owned_organizations")
}

// CRM Account (AWMS: Workshop Locations)
model crm_Accounts {
  id                String        @id @default(auto()) @map("_id") @db.ObjectId
  organizationId    String        @db.ObjectId        // ← CRITICAL: Tenant isolation
  name              String
  status            String?       @default("Inactive")
  assigned_to       String?       @db.ObjectId

  // Automotive-specific fields (AWMS future enhancement)
  // bay_count          Int?
  // location_type      String?       // WAREHOUSE | SERVICE_CENTER | MOBILE
  // certifications     String[]      // ["SAFETY_INSPECTION", "EMISSION_TESTING"]

  organization      Organizations @relation(fields: [organizationId], onDelete: Cascade)
  contacts          crm_Contacts[]
  leads             crm_Leads[]
  opportunities     crm_Opportunities[]
  invoices          Invoices[]
}
```

#### Index Strategy

**Primary Indexes** (Automatic):
- All `@id` fields (ObjectId primary keys)
- All `@unique` fields (email, slug, stripeCustomerId)

**Manual Indexes** (Required for performance):
```prisma
@@index([organizationId])           // ALL models with multi-tenancy
@@index([createdAt])                // Time-series queries
@@index([status])                   // Filtering by status
@@index([assigned_to])              // User assignment lookups
@@index([email])                    // User login queries
```

**Query Performance Targets**:
- List queries (with org filter): < 50ms
- Single document fetch: < 10ms
- Full-text search: < 200ms

---

### 4. Authentication & Authorization

#### NextAuth.js Configuration

```typescript
// lib/auth.ts
export const authOptions: NextAuthOptions = {
  secret: process.env.JWT_SECRET,
  session: { strategy: "jwt" },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    CredentialsProvider({
      async authorize(credentials) {
        // Email/password authentication with bcrypt
      }
    }),
  ],

  callbacks: {
    async session({ token, session }) {
      // Enrich session with user data
      session.user.organizationId = user.organizationId;
      session.user.organization_role = user.organization_role;
      return session;
    },
  },
};
```

**Session Structure**:
```typescript
interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    avatar: string;
    organizationId: string | null;
    organization_role: "VIEWER" | "MEMBER" | "ADMIN" | "OWNER";
    isAdmin: boolean;  // System-wide admin flag
  }
}
```

#### RBAC Role Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│ ROLE: VIEWER                                                 │
│ - Read-only access to all org data                          │
│ - Cannot create, edit, or delete                            │
│ - Suitable for: Auditors, external stakeholders             │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ ROLE: MEMBER (Default for new users)                        │
│ - CREATE: Any resource in organization                      │
│ - READ: All organization data                               │
│ - UPDATE: Own resources only                                │
│ - DELETE: Own resources only                                │
│ - Suitable for: Technicians, sales reps, general staff      │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ ROLE: ADMIN                                                  │
│ - All MEMBER permissions                                    │
│ - UPDATE/DELETE: Any resource in organization               │
│ - Invite/remove team members                                │
│ - Manage organization settings                              │
│ - Suitable for: Shop managers, team leads                   │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ ROLE: OWNER (1 per organization)                            │
│ - All ADMIN permissions                                     │
│ - Change member roles                                       │
│ - Access billing and subscriptions                          │
│ - Delete organization                                       │
│ - Suitable for: Business owners, franchisors                │
└─────────────────────────────────────────────────────────────┘
```

**Permission Enforcement Pattern**:
```typescript
// middleware/require-permission.ts
export function requirePermission(permission: Permission) {
  return async (req: NextRequest) => {
    const session = await getServerSession(authOptions);
    const user = await prismadb.users.findUnique({ where: { email: session.user.email }});

    if (!hasPermission(user.organization_role, permission)) {
      // Log permission denial for audit trail
      await logPermissionDenial({
        userId: user.id,
        organizationId: user.organizationId,
        resource: req.nextUrl.pathname,
        requiredPermission: permission,
        actualRole: user.organization_role,
      });

      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.next();
  };
}
```

---

### 5. Rate Limiting Architecture

#### Plan-Based Rate Limits

```typescript
// lib/rate-limit.ts
export const RATE_LIMITS: Record<OrganizationPlan, { requests: number; windowMs: number }> = {
  FREE:       { requests: 100,   windowMs: 60 * 60 * 1000 }, // 100/hour
  PRO:        { requests: 1000,  windowMs: 60 * 60 * 1000 }, // 1,000/hour
  ENTERPRISE: { requests: 10000, windowMs: 60 * 60 * 1000 }, // 10,000/hour
};
```

**AWMS Context**:
- **FREE Plan**: Solo mechanic, 1-2 service bays → 100 API calls/hour (adequate for ~10 jobs/day)
- **PRO Plan**: Small shop, 3-10 bays → 1,000 API calls/hour (supports ~100 jobs/day)
- **ENTERPRISE Plan**: Chain/franchise, 10+ locations → 10,000 API calls/hour (unlimited practical use)

#### Rate Limiting Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Request arrives at API endpoint                              │
└─────────────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Check bypass patterns                                         │
│    - Health checks (/api/health)                                │
│    - Webhooks (/api/webhooks/*)                                 │
│    - Cron jobs (/api/cron/*)                                    │
└─────────────────────────────────────────────────────────────────┘
                         ▼
         ┌────────────NO bypass────────────┐
         │                                  │
         ▼                                  ▼
┌──────────────────┐              ┌──────────────────┐
│ 3a. Authenticated│              │ 3b. Unauthenticated│
│     Request      │              │     Request      │
└──────────────────┘              └──────────────────┘
         │                                  │
         ▼                                  ▼
┌──────────────────┐              ┌──────────────────┐
│ Get organization │              │ Use IP address   │
│ ID from session  │              │ as identifier    │
└──────────────────┘              └──────────────────┘
         │                                  │
         ▼                                  ▼
┌──────────────────┐              ┌──────────────────┐
│ Fetch org plan   │              │ Default to FREE  │
│ (FREE/PRO/ENT)   │              │ plan limits      │
└──────────────────┘              └──────────────────┘
         │                                  │
         └──────────────┬───────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Check in-memory rate limit counter                           │
│    Key: "org:{orgId}" or "ip:{ipAddress}"                       │
│    Algorithm: Token bucket (simple, fast)                       │
└─────────────────────────────────────────────────────────────────┘
                        ▼
         ┌──────────────┴──────────────┐
         │                              │
         ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│ 5a. Limit OK     │          │ 5b. Limit Exceeded│
│ - Increment count│          │ - Log audit event│
│ - Execute handler│          │ - Return 429     │
│ - Add headers    │          │ - Include Retry  │
│   - X-RateLimit-Limit       │   -After header  │
│   - X-RateLimit-Remaining   │                  │
│   - X-RateLimit-Reset       │                  │
└──────────────────┘          └──────────────────┘
```

#### Endpoint-Specific Overrides

```typescript
// lib/rate-limit-config.ts
export const ENDPOINT_RATE_LIMITS: EndpointRateLimitConfig = {
  // Stricter limits for authentication endpoints (brute-force protection)
  "/api/auth/signin": {
    FREE:       { requests: 10,  windowMs: 15 * 60 * 1000 },  // 10/15min
    PRO:        { requests: 20,  windowMs: 15 * 60 * 1000 },  // 20/15min
    ENTERPRISE: { requests: 50,  windowMs: 15 * 60 * 1000 },  // 50/15min
    useIPFallback: true,  // Always use IP for auth endpoints
  },

  // Generous limits for read operations
  "/api/crm/accounts": {
    FREE:       { requests: 200,  windowMs: 60 * 60 * 1000 }, // 200/hour
    PRO:        { requests: 2000, windowMs: 60 * 60 * 1000 }, // 2,000/hour
    ENTERPRISE: null,  // Unlimited for ENTERPRISE
  },

  // Standard limits for write operations (use plan defaults)
  // Endpoints without custom config use RATE_LIMITS[plan]
};
```

---

### 6. Security Layers

#### Defense-in-Depth Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: NETWORK LAYER                                          │
│ - Cloudflare / Vercel Edge Network (CDN + WAF)                  │
│ - DDoS protection (automatic)                                   │
│ - IP reputation filtering                                       │
│ - TLS 1.3 encryption                                            │
└─────────────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: APPLICATION LAYER (THIS SYSTEM)                        │
│ - Rate limiting middleware (plan-based)                         │
│ - RBAC middleware (permission enforcement)                      │
│ - NextAuth.js session validation                               │
│ - CSRF protection (Same-Origin Policy)                          │
│ - Input validation (Zod schemas)                                │
│ - XSS prevention (React escaping + CSP headers)                 │
└─────────────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: DATA LAYER                                             │
│ - Multi-tenancy isolation (organizationId filter)               │
│ - Prisma ORM (parameterized queries, no SQL injection)          │
│ - MongoDB encryption at rest (Atlas)                            │
│ - Sensitive data hashing (bcrypt for passwords)                 │
└─────────────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 4: AUDIT LAYER                                            │
│ - Comprehensive audit logging (all actions)                     │
│ - Permission denial logging                                     │
│ - Rate limit violation logging                                  │
│ - 90-day retention policy                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## AWMS Feature Mapping

### CRM → AWMS Translation

| **NextCRM Entity**     | **AWMS Equivalent**          | **Automotive Context**                              |
|------------------------|------------------------------|-----------------------------------------------------|
| **Organizations**      | Workshop Chain/Franchise     | Multi-location business entity (e.g., "Speedy Automotive NZ") |
| **Accounts**           | Workshop Locations           | Individual shops (e.g., "Auckland Central", "Wellington South") |
| **Contacts**           | Customers + Staff            | Vehicle owners, mechanics, service advisors          |
| **Leads**              | Service Inquiries            | Inbound calls, online bookings, walk-ins             |
| **Opportunities**      | Service Orders / Repair Jobs | Job from quote to completion (e.g., "2015 Toyota Camry - Brake Service") |
| **Tasks**              | Repair Steps / Job Items     | Individual work items (e.g., "Replace front brake pads", "Inspect rotors") |
| **Documents**          | Vehicle Records              | Service history, inspection reports, invoices, photos |
| **Invoices**           | Customer Billing             | GST-compliant invoices (10% GST AU/NZ), payment tracking |
| **Boards/Projects**    | Job Scheduling               | Kanban boards for bay allocation, technician dispatch |
| **Audit Logs**         | Compliance Trail             | ISO 9001 / automotive industry audit requirements    |

### Automotive-Specific Features (Roadmap)

#### Phase 1: Core AWMS (Q1 2026)
- [ ] **Vehicle Registry**: VIN lookup, make/model database, service history timeline
- [ ] **Bay Management**: Visual bay allocation, drag-and-drop scheduling
- [ ] **Parts Catalog**: Inventory tracking with auto-reorder thresholds
- [ ] **Labor Time Tracking**: Technician clock-in/out, job costing
- [ ] **Compliance Module**: Safety inspection checklist templates (AU/NZ regulations)

#### Phase 2: Integrations (Q2 2026)
- [ ] **OEM Integration**: Parts pricing from Repco, Supercheap Auto, Burson
- [ ] **Accounting Export**: MYOB, Xero integration (AU/NZ accounting standards)
- [ ] **Payment Gateway**: Stripe Terminal (in-shop card readers)
- [ ] **SMS Notifications**: Job status updates (Twilio AU/NZ numbers)
- [ ] **Email Automation**: Appointment reminders, service due notifications

#### Phase 3: Advanced Features (Q3 2026)
- [ ] **Customer Portal**: Online booking, service history access, invoice payment
- [ ] **Mobile App**: Technician mobile app for job updates, photo uploads
- [ ] **AI Assistant**: Service recommendations based on vehicle history (OpenAI)
- [ ] **Analytics Dashboard**: Revenue per bay, technician efficiency, parts turnover
- [ ] **Franchise Management**: Cross-location reporting, centralized parts ordering

---

## Data Flow Diagrams

### User Authentication Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. GET /sign-in
       ▼
┌──────────────────────────────────────┐
│ NextAuth.js Provider Selection       │
│ - Google OAuth                       │
│ - GitHub OAuth                       │
│ - Email/Password (Credentials)       │
└──────┬───────────────────────────────┘
       │ 2. User selects provider
       ▼
┌──────────────────────────────────────┐
│ Authentication Provider              │
│ (Google/GitHub or local bcrypt)      │
└──────┬───────────────────────────────┘
       │ 3. Credentials validated
       ▼
┌──────────────────────────────────────┐
│ Database User Lookup                 │
│ - Find user by email                 │
│ - If not exists, create new user     │
│ - userStatus = PENDING (default)     │
└──────┬───────────────────────────────┘
       │ 4. User record found/created
       ▼
┌──────────────────────────────────────┐
│ Session Creation (JWT)               │
│ - Include: userId, organizationId    │
│ - Include: organization_role, isAdmin│
│ - Expiry: 30 days                    │
└──────┬───────────────────────────────┘
       │ 5. Session cookie set
       ▼
┌──────────────────────────────────────┐
│ Onboarding Check                     │
│ - If organizationId = null           │
│   → Redirect to /onboarding          │
│ - Else → Redirect to /dashboard      │
└──────┬───────────────────────────────┘
       │ 6. User lands in app
       ▼
┌─────────────┐
│  Dashboard  │
└─────────────┘
```

### API Request Lifecycle

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. API Request (e.g., POST /api/crm/account)
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Middleware: Rate Limiting (withRateLimit)                    │
│ - Extract organizationId or IP                               │
│ - Check rate limit counter                                   │
│ - If exceeded → Return 429 + Retry-After header              │
│ - If OK → Increment counter, continue                        │
└──────┬───────────────────────────────────────────────────────┘
       │ 2. Rate limit passed
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Middleware: RBAC (requirePermission)                         │
│ - Get session (NextAuth)                                     │
│ - Fetch user with organizationId                             │
│ - Check hasPermission(user.organization_role, WRITE)         │
│ - If denied → Log audit event, Return 403                    │
│ - If OK → Continue                                           │
└──────┬───────────────────────────────────────────────────────┘
       │ 3. Permission granted
       ▼
┌──────────────────────────────────────────────────────────────┐
│ API Route Handler                                            │
│ - Parse request body (Zod validation)                        │
│ - Extract organizationId from session                        │
│ - Enforce multi-tenancy isolation:                           │
│   await prismadb.crm_Accounts.create({                       │
│     data: { ...input, organizationId }                       │
│   })                                                          │
└──────┬───────────────────────────────────────────────────────┘
       │ 4. Database query executed
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Audit Logging (logCreate)                                    │
│ - Store: action=CREATE, resource=crm_account, changes=input  │
│ - Include: userId, organizationId, ipAddress, userAgent      │
│ - Non-blocking (best effort)                                 │
└──────┬───────────────────────────────────────────────────────┘
       │ 5. Audit log saved
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Response Enrichment                                          │
│ - Add rate limit headers:                                    │
│   X-RateLimit-Limit: 1000                                    │
│   X-RateLimit-Remaining: 987                                 │
│   X-RateLimit-Reset: 1699123456                              │
│ - Return JSON response                                       │
└──────┬───────────────────────────────────────────────────────┘
       │ 6. Response sent to client
       ▼
┌─────────────┐
│   Client    │
└─────────────┘
```

### Multi-Tenant Data Isolation

```
┌─────────────────────────────────────────────────────────────────┐
│ User Session (JWT)                                               │
│ - userId: "user_abc123"                                          │
│ - organizationId: "org_xyz789"  ← CRITICAL: Tenant identifier   │
│ - organization_role: "MEMBER"                                    │
└─────────────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Server Action / API Route                                        │
│                                                                   │
│ const session = await getServerSession(authOptions);             │
│ const orgId = session.user.organizationId; // org_xyz789        │
│                                                                   │
│ // ALWAYS include organizationId filter                          │
│ const accounts = await prismadb.crm_Accounts.findMany({         │
│   where: { organizationId: orgId },  ← Tenant isolation         │
│ });                                                               │
│                                                                   │
│ // NEVER return data without organizationId filter              │
└─────────────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ MongoDB Query (via Prisma)                                       │
│                                                                   │
│ db.crm_Accounts.find({                                           │
│   "organizationId": ObjectId("org_xyz789")                       │
│ })                                                                │
│                                                                   │
│ Result: Only accounts belonging to "org_xyz789" are returned     │
└─────────────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Client Receives Filtered Data                                    │
│ - User only sees their organization's data                       │
│ - No access to other organizations' data                         │
│ - Data leakage impossible (enforced at query level)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Layers

### OWASP Top 10 Mitigation Matrix

| **Vulnerability**          | **Mitigation**                                                  | **Implementation**                  |
|----------------------------|-----------------------------------------------------------------|-------------------------------------|
| A01: Broken Access Control | RBAC middleware + organizationId filter                         | `requirePermission()` + Prisma      |
| A02: Cryptographic Failures| TLS 1.3 + bcrypt + JWT                                          | NextAuth + Vercel SSL               |
| A03: Injection             | Prisma ORM (parameterized queries) + Zod validation             | All database queries via Prisma     |
| A04: Insecure Design       | Secure architecture review + threat modeling                    | This document + security audits     |
| A05: Security Misconfiguration | Environment variables + secure defaults                      | `.env` validation + strict mode     |
| A06: Vulnerable Components | Automated dependency scanning (Dependabot)                      | GitHub Dependabot alerts            |
| A07: Authentication Failures | NextAuth.js + OAuth + rate limiting                           | `withRateLimit()` on auth endpoints |
| A08: Data Integrity Failures | Audit logging + immutable logs                                | AuditLog model (append-only)        |
| A09: Logging Failures      | Comprehensive audit trail + monitoring                          | All actions logged to AuditLog      |
| A10: SSRF                  | No user-controlled URLs + strict input validation               | Zod schemas for all external URLs   |

---

## Multi-Tenancy Design

### Organization-Based Isolation

**Core Principles**:
1. Every data-bearing model includes `organizationId` field
2. All queries MUST filter by `organizationId` (enforced at application layer)
3. No cross-tenant data access (enforced by indexes + application logic)
4. Organization deletion cascades to all child records

**Data Model Pattern**:
```prisma
model crm_Accounts {
  id             String        @id @default(auto()) @map("_id") @db.ObjectId
  organizationId String        @db.ObjectId  // ← Multi-tenancy key
  name           String

  organization   Organizations @relation(fields: [organizationId], onDelete: Cascade)

  @@index([organizationId])  // ← Performance + security
}
```

### Resource Quotas per Plan

```typescript
export const PLAN_QUOTAS = {
  FREE: {
    users: 3,                    // Max team members
    contacts: 100,               // Max customer records
    storage: 1 * 1024 ** 3,      // 1 GB file storage
    projects: 5,                 // Max active jobs
    documents: 100,              // Max file uploads
  },
  PRO: {
    users: 25,
    contacts: 10000,
    storage: 50 * 1024 ** 3,     // 50 GB
    projects: 100,
    documents: 5000,
  },
  ENTERPRISE: {
    users: Infinity,             // Unlimited
    contacts: Infinity,
    storage: Infinity,
    projects: Infinity,
    documents: Infinity,
  },
};
```

**Quota Enforcement** (example):
```typescript
// actions/crm/create-contact.ts
async function createContact(data: ContactInput) {
  const session = await getServerSession(authOptions);
  const orgId = session.user.organizationId;

  // Check quota before creation
  const usage = await getOrganizationUsage(orgId);
  const plan = await getOrganizationPlan(orgId);

  if (usage.contactsCount >= PLAN_QUOTAS[plan].contacts) {
    throw new QuotaExceededError("Contact limit reached for your plan");
  }

  // Create contact with organizationId isolation
  const contact = await prismadb.crm_Contacts.create({
    data: { ...data, organizationId: orgId },
  });

  // Update usage counter
  await updateUsageCounter(orgId, "contactsCount", 1);

  return contact;
}
```

---

## Performance Characteristics

### Average Latencies (95th percentile)

| **Operation**                  | **Latency** | **Notes**                           |
|--------------------------------|-------------|-------------------------------------|
| Session lookup (NextAuth)      | ~10ms       | JWT decode + database query         |
| Rate limit check               | <2ms        | In-memory Map lookup                |
| Permission check               | ~5ms        | Cached role permissions             |
| Database query (single doc)    | ~10ms       | MongoDB Atlas (Sydney region)       |
| Database query (list, filtered)| ~50ms       | With indexes, typical list size     |
| Full-text search               | ~200ms      | MongoDB text index                  |
| File upload (UploadThing)      | ~2s         | 1 MB file, DO Spaces                |
| API route (total)              | ~100ms      | Middleware + handler + DB           |

### Scalability Considerations

**Horizontal Scaling**:
- Vercel serverless functions auto-scale based on traffic
- MongoDB Atlas supports sharding (future: 10k+ orgs)
- Stateless architecture (no server-side sessions)

**Database Sharding Strategy** (future):
- Shard key: `organizationId` (natural tenant boundary)
- Shard size: ~1000 organizations per shard
- Cross-shard queries: Rare (only for system-wide analytics)

**Caching Strategy** (future):
- Redis for: Session data, organization plans, user permissions
- TTL: 5 minutes (balance freshness vs. performance)
- Invalidation: On role change, plan change, org deletion

---

## Deployment Architecture

### Vercel Production Setup

```
┌─────────────────────────────────────────────────────────────────┐
│ Vercel Edge Network (Global CDN)                                 │
│ - 100+ edge locations worldwide                                  │
│ - Automatic SSL/TLS (Let's Encrypt)                             │
│ - DDoS protection (built-in)                                     │
└─────────────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Next.js Serverless Functions (Auto-scaled)                       │
│ - Region: Sydney, Australia (closest to AU/NZ)                  │
│ - Cold start: ~200ms (minimal impact)                           │
│ - Warm instance reuse: ~99% of requests                         │
└─────────────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ MongoDB Atlas (Database)                                         │
│ - Cluster: M10 (dedicated, ~$60/mo)                             │
│ - Region: Sydney (ap-southeast-2)                               │
│ - Replication: 3-node replica set                               │
│ - Backup: Daily snapshots (7-day retention)                     │
└─────────────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ External Services                                                │
│ - Stripe: Payment processing (US/AU)                            │
│ - Resend: Transactional email (global)                          │
│ - UploadThing: File uploads → DigitalOcean Spaces (Sydney)      │
│ - OpenAI: AI features (US)                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Environment Configuration

**Production** (https://nextcrm.io):
- `NODE_ENV=production`
- `NEXTAUTH_URL=https://nextcrm.io`
- `DATABASE_URL=mongodb+srv://prod-cluster.mongodb.net/nextcrm`
- Rate limiting: Enabled (in-memory)
- Audit logging: Enabled (all actions)

**Staging** (https://staging.nextcrm.io):
- `NODE_ENV=production`
- `DATABASE_URL=mongodb+srv://staging-cluster.mongodb.net/nextcrm-staging`
- Rate limiting: Enabled (relaxed limits for testing)
- Audit logging: Enabled

**Development** (http://localhost:3000):
- `NODE_ENV=development`
- `DATABASE_URL=mongodb://localhost:27017/nextcrm-dev`
- Rate limiting: Disabled
- Audit logging: Optional

---

## Monitoring & Observability

### Log Aggregation Strategy

**Vercel Logs**:
- Automatic log collection from serverless functions
- Retention: 7 days (free tier), 30 days (Pro)
- Integration: Logtail, Datadog, or Sentry

**Audit Logs** (Database):
- Stored in `AuditLog` collection
- Retention: 90 days (compliance requirement)
- Indexed by: `organizationId`, `userId`, `createdAt`, `action`

**Key Metrics to Monitor**:
- API error rate (alert if > 5%)
- Rate limit violations (alert if > 100/minute for single org)
- Permission denials (alert if > 50/hour for single user)
- Database query latency (alert if p95 > 100ms)
- Failed login attempts (alert if > 10/minute for single IP)

### Health Check Endpoints

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabaseConnection(),
    auth: await checkNextAuthConfig(),
    storage: await checkUploadThingConnection(),
  };

  const healthy = Object.values(checks).every(Boolean);

  return NextResponse.json(
    { status: healthy ? "healthy" : "degraded", checks },
    { status: healthy ? 200 : 503 }
  );
}
```

---

## Disaster Recovery

### Backup Strategy

**Database Backups** (MongoDB Atlas):
- Automatic snapshots: Every 6 hours
- Retention: 7 days (point-in-time recovery)
- Cross-region replication: Sydney → Singapore (failover)

**File Storage Backups** (DigitalOcean Spaces):
- Versioning: Enabled (30-day version history)
- Replication: Cross-region to Singapore datacenter

**Code Backups**:
- Git repository: GitHub (primary) + GitLab (mirror)
- Deployment history: Vercel (automatic rollback available)

### Recovery Time Objectives (RTO/RPO)

| **Failure Scenario**       | **RTO** | **RPO** | **Recovery Procedure**                  |
|----------------------------|---------|---------|----------------------------------------|
| Vercel outage              | 5 min   | 0       | Automatic failover to backup region    |
| Database corruption        | 1 hour  | 6 hours | Restore from snapshot, replay binlog   |
| Code deployment bug        | 5 min   | 0       | Vercel instant rollback to previous   |
| File storage loss          | 2 hours | 0       | Restore from versioned backup          |
| Complete datacenter outage | 4 hours | 6 hours | Failover to Singapore region           |

---

## Future Enhancements

### Short-Term (Q1 2026)

- [ ] **Redis Rate Limiting**: Replace in-memory with Redis for multi-server deployments
- [ ] **Real-Time Features**: WebSocket/SSE for live job updates, notifications
- [ ] **Mobile App**: React Native app for technicians (photo upload, job updates)
- [ ] **Advanced Search**: Elasticsearch for full-text search across all entities
- [ ] **Bulk Operations**: Import/export CSV for contacts, accounts, inventory

### Medium-Term (Q2-Q3 2026)

- [ ] **OEM Integrations**: Parts pricing APIs (Repco, Supercheap Auto)
- [ ] **Accounting Export**: MYOB and Xero integration
- [ ] **Payment Terminal**: Stripe Terminal for in-shop payments
- [ ] **Customer Portal**: Self-service booking, service history access
- [ ] **AI Service Recommendations**: OpenAI-powered maintenance predictions

### Long-Term (Q4 2026+)

- [ ] **Franchise Module**: Cross-location reporting, centralized inventory
- [ ] **IoT Integration**: Vehicle diagnostic data import (OBD-II readers)
- [ ] **Marketplace**: Third-party integrations (insurance, warranty providers)
- [ ] **White-Label**: Rebrand for workshop chains (custom domain, branding)
- [ ] **Compliance Automation**: Automatic emission test scheduling, safety cert reminders

---

## Appendix

### Key File Locations

| **Component**              | **File Path**                                      |
|----------------------------|----------------------------------------------------|
| Database schema            | `prisma/schema.prisma`                             |
| Authentication config      | `lib/auth.ts`                                      |
| Rate limiting logic        | `lib/rate-limit.ts`                                |
| RBAC permissions           | `lib/permissions.ts`                               |
| Permission middleware      | `middleware/require-permission.ts`                 |
| Rate limit middleware      | `middleware/with-rate-limit.ts`                    |
| Audit logger               | `lib/audit-logger.ts`                              |
| Stripe integration         | `lib/stripe.ts`                                    |
| API routes                 | `app/api/**/*.ts`                                  |
| Server actions             | `actions/**/*.ts`                                  |
| UI components              | `components/ui/*.tsx`                              |

### Glossary

- **AWMS**: Automotive Workshop Management System (target product)
- **Multi-Tenancy**: Architecture pattern where single instance serves multiple organizations
- **RBAC**: Role-Based Access Control (permission system with 4 roles)
- **JWT**: JSON Web Token (session authentication format)
- **GST**: Goods and Services Tax (10% in Australia and New Zealand)
- **OBD-II**: On-Board Diagnostics (vehicle diagnostic protocol)
- **VIN**: Vehicle Identification Number (unique 17-character vehicle ID)

### Related Documentation

- [SECURITY.md](./SECURITY.md) - Complete security documentation
- [RBAC.md](./RBAC.md) - RBAC implementation guide
- [MAINTENANCE.md](./MAINTENANCE.md) - Operational guide
- [RATE_LIMITING.md](./RATE_LIMITING.md) - Rate limiting deep dive

---

**Document Maintained By**: AWMS Platform Team
**Last Review**: November 4, 2025
**Next Review**: February 1, 2026
