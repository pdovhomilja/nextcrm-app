# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TaskHQ (taskhq.xmation.ai)** is a Next.js 15.4.4 application built as a task and project management platform. It features a comprehensive authentication system, kanban-style task boards with drag-and-drop functionality, and company-based access control. The project uses TypeScript, App Router architecture, Prisma ORM with PostgreSQL, Next-Auth v5, and shadcn/ui components with task management capabilities.

## Development Commands

### Core Development
- `pnpm dev` - Start development server with Turbopack (http://localhost:3000)
- `pnpm build` - Build the application for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint for code linting

### Database Management
- `npx prisma generate` - Generate Prisma client after schema changes
- `npx prisma db push` - Push schema changes to database
- `npx prisma studio` - Open Prisma Studio for database inspection


## Architecture & Key Technologies

### Frontend Stack
- **Next.js 15.4.4** with App Router (`app/` directory structure)
- **React 19.1.0** with TypeScript (ES2017 target)
- **Tailwind CSS v4** with PostCSS and CSS variables support
- **shadcn/ui** components (New York style, neutral base color, CSS variables)
- **Lucide React** icons
- **Geist font family** (sans and mono variants from Google Fonts)
- **React Query/TanStack Query** for data fetching
- **@dnd-kit** for drag-and-drop functionality in kanban boards
- **@tabler/icons-react** for additional icons

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
- **Prisma ORM** with PostgreSQL database
- **Custom Prisma client path**: `lib/generated/prisma/`
- **Auto-generated CUIDs** for all primary keys
- **Database Models**:
  - `User` - with email verification, password hashing, company ID, role-based access
  - `Account` - OAuth account linking
  - `Session` - Next-Auth sessions
  - `VerificationToken` - Email verification tokens
  - `Task` - Task management with priorities, status, assignments, and due dates
  - `Board` - Project boards with access control
  - `BoardSection` - Kanban columns/sections within boards
  - `TaskHistory` - Task change tracking and audit logs
- **Indexed fields** for optimized queries
- **Prisma Accelerate** extension support

### Server Actions Architecture
- **Location**: `/actions` folder with `"use server"` directives
- **Authentication actions**:
  - `registerUser()` - User registration with email verification
  - `authenticateUser()` - Login with credentials
  - `signOutUser()` - Logout functionality
- **Task management actions**:
  - Board CRUD operations (create, read, update, delete)
  - Task CRUD operations with assignments and status updates
  - Board section management for kanban columns
  - Drag-and-drop position updates for tasks and sections
- **Form Integration** with Next.js 15 server actions

### Email System
- **Resend** for transactional emails
- **React Email** components for email templates
- **Email verification flow** with token generation
- **Custom from address**: `TaskHQ <pavel@endorphinit.com>`

### Task Management Features
- **Kanban Board System**: Drag-and-drop task management across board sections
- **Task Priorities**: LOW, MEDIUM, HIGH, CRITICAL priority levels
- **Task Status**: NEW, IN_PROGRESS, COMPLETED, CANCELLED, ON_HOLD
- **User Roles**: USER, CONTRIBUTOR, EDITOR, MEDIA, ADMIN role hierarchy
- **Task Assignment**: Multi-user task assignment with creator/assignee tracking
- **Board Access Control**: Permission-based board access with user arrays
- **Task History**: Complete audit trail of task changes and updates

### File Structure
```
├── actions/                    # Server actions (Next.js 15)
│   ├── auth-actions.ts        # Authentication server actions
│   ├── user.ts                # User management actions
│   ├── users/                 # User-related actions
│   │   └── get-users.tsx     # User retrieval functions
│   └── tasks/                 # Task management actions
│       ├── create-board.ts    # Board creation
│       ├── create-board-section.ts # Board section management
│       ├── create-task.ts     # Task creation
│       ├── delete-board.ts    # Board deletion
│       ├── delete-task.ts     # Task deletion
│       ├── get-board.ts       # Board retrieval
│       ├── get-boards.ts      # Multiple boards retrieval
│       ├── get-board-sections.ts # Board sections retrieval
│       ├── update-section-position.ts # Section drag-and-drop
│       └── update-task-position.ts # Task drag-and-drop
├── app/                       # Next.js App Router
│   ├── (app)/[cid]/          # Company-specific protected routes
│   │   ├── dashboard/        # Dashboard pages
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
│   │   │   │   └── error-boundary.tsx
│   │   │   ├── _types/       # Task-related TypeScript types
│   │   │   │   └── index.ts
│   │   │   └── page.tsx      # Task boards overview
│   │   └── layout.tsx        # Company layout
│   ├── auth/signin/          # Authentication pages
│   ├── api/                  # API routes
│   │   ├── auth/[...nextauth]/ # Next-Auth configuration
│   │   ├── register/         # Registration endpoint
│   │   └── verify-email/     # Email verification endpoint
│   ├── globals.css           # Global Tailwind styles
│   ├── layout.tsx            # Root layout with SessionProvider
│   └── page.tsx              # Landing page
├── components/               # React components
│   ├── auth/                 # Authentication components
│   │   └── sign-out-button.tsx
│   └── ui/                   # shadcn/ui components
├── emails/                   # React Email templates
│   └── verification-email.tsx
├── lib/                      # Utility libraries
│   ├── generated/prisma/     # Generated Prisma client
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

# NextAuth.js
AUTH_SECRET="your-secret-here"  # JWT signing secret
NEXTAUTH_URL="http://localhost:3000"

# Email (Resend)
RESEND_API_KEY="your-resend-api-key"

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
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