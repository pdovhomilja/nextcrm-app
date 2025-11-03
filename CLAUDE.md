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

### Database Management
```bash
# Generate Prisma client
pnpm prisma generate

# Push schema to database
pnpm prisma db push

# Seed database with initial data
pnpm prisma db seed

# Open Prisma Studio
pnpm prisma studio
```

### Testing
```bash
# Run Cypress e2e tests
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

## Testing Considerations

- Cypress is configured for e2e testing (baseUrl: http://localhost:3000)
- No Jest configuration currently present
- Test files would typically go in `__tests__` or `*.test.ts` files
- Roadmap mentions adding Jest + comprehensive testing

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

### Deploying
- Vercel deployment configured (vercel.json present)
- Docker deployment available
- CI/CD via GitHub Actions (workflows in .github/workflows/)
- Ensure all environment variables are set in deployment platform
