# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NextCRM is an open-source CRM built with Next.js 15, TypeScript, MongoDB (via Prisma), and shadcn/ui components. The application provides comprehensive CRM functionality including account management, contacts, leads, opportunities, invoicing, project management, and document handling.

## Development Commands

### Setup and Installation
```bash
# Install dependencies
pnpm install

# Copy environment files
cp .env.example .env
cp .env.local.example .env.local

# Initialize Prisma
pnpm prisma generate
pnpm prisma db push

# Seed initial data
pnpm prisma db seed
```

### Development
```bash
# Start development server (runs on http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

### Database Operations
```bash
# Generate Prisma client
pnpm prisma generate

# Push schema changes to database
pnpm prisma db push

# Seed database with initial data
pnpm prisma db seed

# Open Prisma Studio (database GUI)
pnpm prisma studio
```

### Testing
```bash
# Run Playwright tests (headless)
pnpm test:e2e

# Run Playwright tests with UI
pnpm test:e2e:ui

# Run Playwright tests in headed mode
pnpm test:e2e:headed

# Debug Playwright tests
pnpm test:e2e:debug
```

## Architecture

### Directory Structure

- **`/app`** - Next.js 15 App Router structure
  - **`/[locale]`** - Internationalized routes (next-intl)
    - **`/(auth)`** - Authentication pages (sign-in, register, inactive, pending)
    - **`/(routes)`** - Protected application routes
      - **`/admin`** - Admin panel (user management, module configuration)
      - **`/crm`** - CRM module (accounts, contacts, leads, opportunities, contracts, tasks)
      - **`/projects`** - Project management (boards, tasks, kanban)
      - **`/invoice`** - Invoice management with Rossum AI integration
      - **`/documents`** - Document storage and management
      - **`/emails`** - Email client functionality
      - **`/employees`** - Employee management
      - **`/reports`** - Analytics and reporting
      - **`/secondBrain`** - Notion integration
  - **`/api`** - API routes organized by feature (crm, projects, invoice, etc.)
  - **`/providers`** - React context providers

- **`/actions`** - Server actions organized by domain (crm, projects, invoice, documents, etc.)

- **`/components`** - React components
  - **`/ui`** - shadcn/ui components (buttons, forms, dialogs, etc.)
  - **`/form`** - Form components (inputs, selects, datepickers)
  - **`/modals`** - Modal dialogs
  - **`/sheets`** - Sheet components
  - **`/tremor`** - Chart components

- **`/lib`** - Utility libraries
  - `auth.ts` - NextAuth configuration
  - `prisma.ts` - Prisma client singleton
  - `openai.ts` - OpenAI integration
  - `notion.ts` - Notion API integration
  - `resend.ts` - Email service (Resend)
  - `uploadthing.ts` - File upload handling
  - `create-safe-action.ts` - Type-safe server action wrapper

- **`/prisma`** - Database schema and migrations
  - `schema.prisma` - Database models (MongoDB)
  - **`/seeds`** - Database seeding scripts

- **`/emails`** - React Email templates

- **`/types`** - TypeScript type definitions

- **`/locales`** - Internationalization translation files (next-intl)

- **`/rossum`** - Rossum AI invoice parsing integration

### Tech Stack

- **Framework**: Next.js 15 with App Router and React 19
- **Language**: TypeScript (strict mode enabled)
- **Database**: MongoDB with Prisma ORM
- **Authentication**: NextAuth.js (Google, GitHub, Credentials providers)
- **UI**: Tailwind CSS, shadcn/ui (Radix UI), Tremor charts
- **State Management**: Zustand, Jotai
- **Data Fetching**: SWR, Axios, Server Actions
- **Internationalization**: next-intl
- **File Storage**: UploadThing, AWS S3 (DigitalOcean Spaces)
- **Email**: Resend + React Email
- **AI**: OpenAI API, Rossum (invoice parsing)
- **Testing**: Playwright

### Authentication Flow

Authentication uses NextAuth.js with JWT strategy:
- Configuration in `lib/auth.ts:24`
- Supports Google OAuth, GitHub OAuth, and credentials (email/password)
- New users from OAuth are auto-created in database with `PENDING` status (except demo environment)
- User status determines access: `ACTIVE`, `PENDING`, or `INACTIVE`
- Session callback updates user data and tracks `lastLoginAt`

### Database Models

Key Prisma models (MongoDB):
- `Users` - User accounts with authentication, roles, and preferences
- `crm_Accounts` - Company/organization records
- `crm_Contacts` - Contact persons linked to accounts
- `crm_Leads` - Sales leads
- `crm_Opportunities` - Sales opportunities with stages
- `crm_Contracts` - Contract management
- `Projects` - Project boards
- `Tasks` - Tasks for projects and CRM
- `Invoices` - Invoice records with Rossum integration
- `Documents` - File metadata for uploaded documents
- `Modules` - Configurable application modules
- `SecondBrain` - Notion database integration

Relations use MongoDB ObjectId references.

### API Routes

API routes follow RESTful conventions in `/app/api`:
- **CRM**: `/api/crm/{accounts|contacts|leads|opportunity}` - CRUD operations
- **Projects**: `/api/projects` - Project and task management
- **Invoice**: `/api/invoice` - Invoice operations, Rossum integration
- **Documents**: `/api/documents` - File management
- **User**: `/api/user` - User profile and settings
- **Admin**: `/api/admin` - Administrative functions

API routes use Prisma for database access and return JSON responses.

### Server Actions

Server actions in `/actions` directory provide type-safe data fetching:
- Organized by domain (crm, projects, invoice, documents, dashboard)
- Use `create-safe-action.ts` for validation with Zod schemas
- Pattern: `actions/{domain}/{action}/index.ts`, `schema.ts`, `types.ts`

### Internationalization

Uses next-intl with locale-based routing:
- Locales stored in `/locales` as JSON files
- Routes prefixed with `[locale]` parameter
- Translations accessed via `useTranslations()` hook or `createTranslator()`

### File Uploads

- UploadThing for main file storage (configured in `app/api/uploadthing`)
- S3-compatible storage (DigitalOcean Spaces) via AWS SDK
- Document metadata stored in `Documents` model

### Module System

Application features are controlled by `Modules` table:
- Admins can enable/disable modules (CRM, Projects, Documents, etc.)
- Module state affects navigation and feature availability

### Email System

- Resend + React Email for transactional emails
- Email templates in `/emails` directory
- SMTP/IMAP configuration for email client functionality
- AI-generated notifications via OpenAI

### Environment Variables

Required environment variables (see `.env.example` and `.env.local.example`):
- `DATABASE_URL` - MongoDB connection string
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `JWT_SECRET` - Authentication
- `GOOGLE_ID`, `GOOGLE_SECRET` - Google OAuth
- `GITHUB_ID`, `GITHUB_SECRET` - GitHub OAuth
- `UPLOADTHING_SECRET`, `UPLOADTHING_APP_ID` - File uploads
- `RESEND_API_KEY` - Email service
- `OPENAI_API_KEY` - AI features
- `ROSSUM_USERNAME`, `ROSSUM_PASSWORD` - Invoice parsing
- SMTP/IMAP credentials for email client

## Development Notes

### Path Aliases

TypeScript path aliases configured in `tsconfig.json:22`:
- `@/*` - Project root
- `@/ui/*` - UI components directory

### Code Organization

- Server components are the default (Next.js 15)
- Use `"use client"` directive for client-side interactivity
- API routes return JSON; use proper HTTP status codes
- Server actions handle form submissions and mutations
- Components follow shadcn/ui patterns

### Styling

- Tailwind CSS with custom configuration
- shadcn/ui components use `class-variance-authority` and `tailwind-merge`
- Theme switching via `next-themes` (light/dark mode)

### Testing Strategy

- Playwright for E2E testing (tests in `/tests/e2e`)
- Test coverage is limited (roadmap item #4)
- Run tests: `pnpm test:e2e`

### Database Seeding

Seed script at `prisma/seeds/seed.ts` initializes:
- Default admin user
- Industry types
- Sales stages
- System modules
- Other reference data

Run after schema changes with `pnpm prisma db seed`.
