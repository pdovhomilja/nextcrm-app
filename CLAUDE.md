# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NextCRM is a Customer Relationship Management system built with Next.js 15, TypeScript, Prisma, MongoDB, and shadcn/ui. It's a modular CRM with support for accounts, contacts, leads, opportunities, invoices, projects, documents, and AI-powered features.

## Development Commands

### Environment Setup
```bash
# Install dependencies (uses pnpm)
pnpm install

# Copy environment files
cp .env.example .env
cp .env.local.example .env.local

# Initialize Prisma
pnpm prisma generate
pnpm prisma db push
pnpm prisma db seed
```

### Development & Build
```bash
# Start development server (runs on http://localhost:3000)
pnpm dev

# Build for production (chains: prisma generate → db push → db seed → next build)
pnpm build

# Start production server
pnpm start

# Lint code (ESLint)
pnpm lint

# TypeScript type checking (used in CI)
pnpm tsc --noEmit
```

### Database Management
```bash
# Generate Prisma client (REQUIRED after schema changes)
pnpm prisma generate

# Push schema to database
pnpm prisma db push

# Seed database with initial data
pnpm prisma db seed

# Open Prisma Studio (GUI at http://localhost:5555)
pnpm prisma studio
```

### Testing
```bash
# Run all Jest tests
pnpm test

# Jest watch mode
pnpm test:watch

# Unit tests only
pnpm test:unit

# Integration tests only
pnpm test:integration

# Generate coverage report
pnpm test:coverage

# CI mode (coverage + worker limit)
pnpm test:ci

# Run Cypress e2e tests (interactive GUI)
pnpm cypress open

# Run Cypress headless
pnpm cypress run
```

### Docker
```bash
# Build Docker image
docker build -t nextcrm .

# Run container
docker run -p 3000:3000 nextcrm
```

## Architecture

### Directory Structure

```
nextcrm-app/
├── app/                          # Next.js 15 App Router
│   └── [locale]/                 # Internationalization (en, de, cz, uk)
│       ├── (auth)/               # Authentication routes (sign-in, register)
│       └── (routes)/             # Main application routes
│           ├── crm/              # CRM module (accounts, contacts, leads, opportunities)
│           ├── invoice/          # Invoice management
│           ├── projects/         # Project management with tasks
│           ├── documents/        # Document storage
│           ├── emails/           # Email client
│           ├── reports/          # Analytics and reporting
│           └── admin/            # Admin panel (users, modules)
├── app/api/                      # API routes organized by feature
│   ├── crm/                      # CRM API endpoints
│   ├── invoice/                  # Invoice API endpoints
│   ├── projects/                 # Projects API endpoints
│   ├── auth/                     # Authentication endpoints
│   └── openai/                   # AI integration endpoints
├── actions/                      # Server Actions organized by feature
│   ├── crm/                      # CRM actions
│   ├── projects/                 # Project actions
│   ├── invoice/                  # Invoice actions
│   └── admin/                    # Admin actions
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── form/                     # Form components
│   ├── modals/                   # Modal components
│   └── sheets/                   # Sheet components (side panels)
├── lib/                          # Utilities and configurations
│   ├── auth.ts                   # NextAuth configuration
│   ├── prisma.ts                 # Prisma client
│   ├── openai.ts                 # OpenAI integration
│   ├── resend.ts                 # Email service
│   ├── uploadthing.ts            # File upload configuration
│   └── utils.ts                  # Utility functions
├── prisma/                       # Database schema and seeds
│   ├── schema.prisma             # Prisma schema (MongoDB)
│   ├── seeds/                    # Database seeding scripts
│   └── initial-data/             # Initial data JSON files
├── store/                        # Zustand state management
│   ├── store.ts                  # Main store
│   └── slices/                   # Store slices
├── types/                        # TypeScript type definitions
├── locales/                      # i18n translation files (en, de, cz, uk)
├── emails/                       # React Email templates
├── hooks/                        # Custom React hooks
└── middleware.tsx                # next-intl middleware for i18n
```

### Key Architectural Patterns

**Modular Feature Organization**: Each major feature (CRM, projects, invoices) is organized vertically:
- Route pages in `app/[locale]/(routes)/[feature]/`
- API routes in `app/api/[feature]/`
- Server actions in `actions/[feature]/`
- Components often co-located in `[feature]/components/`

**Data Tables Pattern**: CRM modules use @tanstack/react-table with a consistent structure:
- `columns.tsx` - Table column definitions
- `data-table-*.tsx` - Reusable table components
- Server-side filtering, sorting, and pagination

**Authentication**: NextAuth.js with three providers:
- Google OAuth
- GitHub OAuth
- Credentials (email/password with bcrypt)
- Session strategy: JWT
- User status workflow: PENDING → ACTIVE/INACTIVE

**Database**: MongoDB via Prisma ORM
- All models prefixed by module (e.g., `crm_Accounts`, `crm_Leads`)
- ObjectId for all IDs
- Audit fields: `createdAt`, `createdBy`, `updatedAt`, `updatedBy`

**File Storage**: UploadThing + DigitalOcean Spaces (S3-compatible)

**Email**: Resend + React Email templates

**Internationalization**: next-intl with 4 locales (en, de, cz, uk)
- All user-facing strings should use translations
- Translation files in `locales/[locale]/`

**State Management**:
- Zustand for client state
- SWR for data fetching
- React Hook Form for forms
- Zod for validation

**AI Integration**:
- OpenAI for automated email notifications
- Project management AI assistant
- Rossum for invoice data extraction

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15.2.4 (React 19 RC) |
| **Language** | TypeScript 5.6.3 (strict mode) |
| **Package Manager** | pnpm (enforced) |
| **Database** | MongoDB via Prisma 5.22.0 |
| **Auth** | NextAuth.js 4.24.10 (JWT) |
| **Styling** | Tailwind CSS 3.4.14 |
| **Components** | shadcn/ui + Radix UI |
| **Forms** | React Hook Form 7.53.2 + Zod 3.23.8 |
| **Data Fetching** | SWR 2.2.5 + Axios 1.7.7 |
| **Tables** | TanStack React Table 8.20.5 |
| **State** | Zustand 5.0.1 |
| **Charts** | Tremor 3.18.4 |
| **File Upload** | UploadThing 7.3.0 |
| **Email** | Resend 4.0.1-alpha + React Email 0.0.28 |
| **AI** | OpenAI 4.71.1 + Rossum AI |
| **Testing** | Jest 30.2.0 + Cypress 13.15.2 |
| **CI/CD** | GitHub Actions + Vercel |
| **Deployment** | Vercel (primary) + Docker |

## Code Standards

### TypeScript
- Use strict TypeScript (strict mode enabled)
- Prefer interfaces over types for object shapes
- Use proper typing, avoid `any` (project is working to eliminate all `any` types)
- Path aliases: `@/*` for root, `@/ui/*` for components/ui

### Components
- Use Server Components by default (Next.js 15)
- Mark with `'use client'` only when necessary (hooks, state, events)
- Follow shadcn/ui patterns for UI components
- Use Radix UI primitives via shadcn/ui

### Styling
- Tailwind CSS for all styling
- Use `cn()` utility from `lib/utils.ts` for conditional classes
- Follow shadcn/ui design tokens

### Forms
- Use React Hook Form + Zod validation
- Use `@hookform/resolvers` for Zod integration
- Form components in `components/form/`

### Database Queries
- Always use Prisma client from `lib/prisma.ts`
- Include audit fields when creating/updating records
- Use proper relations and include statements

### Error Handling
- Use try-catch in Server Actions and API routes
- Return appropriate HTTP status codes in API routes
- Display errors to users via toast notifications (react-hot-toast or sonner)

## Configuration

### TypeScript (`tsconfig.json`)
- Target: ES5 (backwards compatibility)
- Strict mode: ENABLED
- Path aliases: `@/*` → `./` (root), `@/ui/*` → `./components/ui/`
- Next.js plugin enabled for strict type checking

### Next.js (`next.config.js`)
- **Plugins:** next-intl for internationalization
- **Security Headers:** HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- **Image Domains:** localhost, cloudinary.com, lh3.googleusercontent.com, uploadthing.com, utfs.io

### Jest (`jest.config.js`)
- **Environment:** jsdom (browser simulation)
- **Transform:** @swc/jest for fast TS/TSX transpilation
- **Coverage Targets:** app/, actions/, components/, lib/
- **Test Patterns:** `__tests__/**/*.{test,spec}.{ts,tsx}`, `tests/**/*.{test,spec}.{ts,tsx}`

### Middleware (`middleware.tsx`)
- **Localization:** next-intl middleware for route localization
- **Locales:** en, de, cz, uk (4 languages)
- **Default:** en
- **Matcher:** All paths except /api, /_next, file extensions

## Testing

### Jest Tests
**Location:** `tests/unit/`, `tests/integration/`, or `__tests__/`

Run tests:
```bash
pnpm test              # All tests
pnpm test:watch       # Watch mode
pnpm test:unit        # Unit tests
pnpm test:integration # Integration tests
pnpm test:coverage    # Coverage report
```

**Setup:** Database required for integration tests (seed with test data), mock external APIs with MSW

### E2E Tests (Cypress)
**Location:** `cypress/e2e/`

Run tests:
```bash
pnpm cypress open     # Interactive GUI
pnpm cypress run      # Headless mode
```

**Configuration:** Base URL `http://localhost:3000`, Matrix strategy with MongoDB 4.2-6.0

### Code Quality Checks
```bash
pnpm lint              # ESLint
pnpm tsc --noEmit      # TypeScript check
```

**Before Commit:** Run `pnpm lint && pnpm tsc --noEmit && pnpm test`

## Environment Variables

### Required (.env)
- `DATABASE_URL` - MongoDB connection string

### Required (.env.local)
- `NEXTAUTH_URL` - Application URL
- `JWT_SECRET` - JWT secret (generate with: `openssl rand -base64 32`)
- `GOOGLE_ID`, `GOOGLE_SECRET` - Google OAuth credentials
- `GITHUB_ID`, `GITHUB_SECRET` - GitHub OAuth credentials
- Email configuration: `EMAIL_HOST`, `EMAIL_FROM`, `EMAIL_USERNAME`, `EMAIL_PASSWORD`
- IMAP configuration: `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASSWORD`

### Optional
- `UPLOADTHING_SECRET`, `UPLOADTHING_APP_ID` - File uploads
- `OPEN_AI_API_KEY` - AI features
- `ROSSUM_API_URL`, `ROSSUM_USER`, `ROSSUM_PASS` - Invoice parsing
- `RESEND_API_KEY` - Email service
- DigitalOcean Spaces: `DO_ENDPOINT`, `DO_REGION`, `DO_BUCKET`, `DO_ACCESS_KEY_ID`, `DO_ACCESS_KEY_SECRET`

## Module-Specific Patterns

### CRM Module
- Accounts, Contacts, Leads, Opportunities all follow similar patterns
- Each has CRUD operations via Server Actions
- "Assigned to" field links to Users
- "Watchers" system for multi-user tracking
- Status workflows (e.g., Lead: NEW → CONTACTED → QUALIFIED → LOST)

### Invoice Module
- Integration with Rossum AI for data extraction
- Document upload via UploadThing
- PDF generation capabilities
- Link to Accounts

### Projects Module
- Task management with status tracking
- AI-powered notifications
- Task assignment to users
- Project-to-account linking

### Documents Module
- File storage via UploadThing or DigitalOcean Spaces
- Document viewer (react-doc-viewer)
- Association with Accounts, Leads, Contacts

### Email Module
- IMAP integration for receiving emails
- SMTP integration for sending
- Email templates via React Email
- Notion integration available

## Important Notes

- **Package Manager**: Always use `pnpm`, not `npm` or `yarn`
- **Build Process**: Build command includes Prisma generation, push, and seed
- **Prisma Seed**: Uses `ts-node` to run TypeScript seed files
- **Demo Mode**: When deployed at https://demo.nextcrm.io, new users are automatically ACTIVE
- **User Status**: Regular deployments require admin approval (PENDING → ACTIVE)
- **Byterover MCP**: Project uses byterover-mcp for knowledge management
  - Use `byterover-store-knowledge` to save patterns and solutions
  - Use `byterover-retrieve-knowledge` before starting new tasks

## Key Architectural Patterns

### Multi-Tenancy
- **Isolation Key:** `organizationId` on every query (mandatory)
- **Row-Level Security:** All Prisma queries must filter by organizationId
- **Multi-Admin:** Organizations can have multiple owners and admins
- **Invitations:** Email-based team invitations with role assignment
- **Session:** JWT includes organizationId, available in all Server Components

### Authentication Flow
1. User logs in (OAuth or credentials)
2. NextAuth verifies identity
3. Session callback:
   - **NEW USER:** Created in DB, status = PENDING or ACTIVE (demo mode: auto-ACTIVE)
   - **EXISTING USER:** lastLoginAt updated
4. JWT token includes `organizationId` + user metadata
5. Session available via `getSession()` in Server Components

### Server Actions Pattern
- Organized by feature: `actions/crm/account/`, `actions/invoice/`, etc.
- Naming: `get-*`, `create-*`, `update-*`, `delete-*`
- Return: Promise with typed data or error
- Used in: Forms, client components, data fetching
- Automatic revalidation with `revalidatePath()` / `revalidateTag()`

### Data Table Pattern (TanStack React Table)
- `columns.tsx` - Column definitions with sorting/filtering
- `data-table-*.tsx` - Reusable table wrappers
- Server-side pagination, sorting, filtering
- Standardized across CRM modules (Accounts, Leads, Opportunities, Contacts)

### Rate Limiting & Security
- **Redis-backed:** `lib/rate-limit-redis.ts` for distributed systems
- **Thresholds:** Configurable in `lib/rate-limit-config.ts`
- **UI Indicator:** `rate-limit-indicator.tsx` warns users
- **Audit Logging:** All user actions tracked (CREATE, UPDATE, DELETE, LOGIN, etc.)
- **Security Headers:** HSTS, CSP, X-Frame-Options configured

## Deployment

### Vercel (Primary)
- **Build Command:** `pnpm build`
- **Start Command:** `pnpm start`
- **Environment:** Configure all .env.local variables in Vercel dashboard
- **Auto-Deploy:** On main branch push
- **Demo Mode:** https://demo.nextcrm.io auto-activates new users

### Docker
- **Multi-stage build:** deps → build → production
- **Base:** node:20-slim
- **Build:** `pnpm install && pnpm build && pnpm start`
- **Port:** 3000
- **User:** nextjs (non-root for security)

### GitHub Actions CI/CD
**Workflows in `.github/workflows/`:**
- `cypress.yml` - E2E tests (MongoDB matrix, parallel runs)
- `test.yml` - Unit/integration + lint + typecheck + coverage
- `docker.yml` - Docker image build and push

**CI Pipeline:**
1. Checkout + setup pnpm cache
2. Install dependencies (frozen-lockfile)
3. Prisma generate
4. ESLint + TypeScript check
5. Jest tests (unit + integration)
6. Coverage upload to Codecov
7. Cypress e2E tests (parallel matrix)

## Common Tasks

### Adding a New CRM Entity
1. Add Prisma model in `schema.prisma` with prefix (e.g., `crm_NewEntity`)
2. Run `pnpm prisma generate && pnpm prisma db push`
3. Create page: `app/[locale]/(routes)/crm/new-entity/page.tsx`
4. Create Server Actions: `actions/crm/new-entity/`
5. Create API routes: `app/api/crm/new-entity/`
6. Create table components following existing patterns
7. Add to navigation/sidebar

### Adding Translations
1. Add keys to all locale files: `locales/[locale]/`
2. Import and use in components: `import { useTranslations } from 'next-intl'`
3. Use `t('key')` in components

## Quick Start for New Developers

### Initial Setup (5 minutes)
```bash
# 1. Clone and install
git clone <repo>
cd nextcrm-app
pnpm install

# 2. Setup environment
cp .env.example .env
cp .env.local.example .env.local
# Edit .env with MongoDB URI
# Edit .env.local with OAuth keys, API keys

# 3. Initialize database
pnpm prisma generate
pnpm prisma db push
pnpm prisma db seed

# 4. Start dev server
pnpm dev
# Visit http://localhost:3000
```

### Before Committing
```bash
pnpm lint              # Check linting
pnpm tsc --noEmit      # Check types
pnpm test              # Run tests
```

### Feature Development Checklist
- [ ] Add Prisma model (if needed) → `pnpm prisma generate && pnpm prisma db push`
- [ ] Create Server Actions in `actions/[feature]/`
- [ ] Create API routes in `app/api/[feature]/` (if needed)
- [ ] Create pages in `app/[locale]/(routes)/[feature]/`
- [ ] Add components in `components/` or co-located
- [ ] Add translations to all locale files in `locales/`
- [ ] Add permissions to `lib/permissions.ts` (if applicable)
- [ ] Add tests in `tests/unit/` or `tests/integration/`
- [ ] Update navigation/sidebar
- [ ] Run `pnpm lint && pnpm tsc --noEmit && pnpm test`

## Key Files to Review First

1. **`lib/auth.ts`** - Authentication & multi-tenancy configuration
2. **`prisma/schema.prisma`** - Database models and relationships
3. **`app/[locale]/(routes)/crm/accounts/page.tsx`** - Example page structure
4. **`actions/crm/account/`** - Server action patterns
5. **`components/form/`** - Form component patterns
6. **`store/store.ts`** - Zustand state management setup
7. **`lib/permissions.ts`** - Role-based access control (RBAC)

## Critical Notes

- **ALWAYS use pnpm** - Not npm or yarn (enforced in ci/cd)
- **ALWAYS filter by organizationId** - Multi-tenancy is mandatory
- **ALWAYS use Server Components** - Mark with 'use client' only when necessary
- **ALWAYS run migrations** - After schema.prisma changes: `pnpm prisma generate && pnpm prisma db push`
- **Build chain:** `prisma generate` → `prisma db push` → `prisma db seed` → `next build`
- **Environment:** Keep .env (database) and .env.local (secrets) separate and in .gitignore
- **Demo Mode:** At https://demo.nextcrm.io, new users auto-activate; elsewhere they need admin approval
