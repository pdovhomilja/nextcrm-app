# Technical Stack

## Application Framework
- **Next.js**: 15.4.4 (App Router architecture)
- **React**: 19.1.0 (Latest stable with concurrent features)
- **TypeScript**: ES2017 target with strict mode enabled

## Database System
- **PostgreSQL**: Production database with pgvector extension for vector embeddings
- **Prisma ORM**: 6.15.0 with typed SQL support and custom client path (lib/generated/prisma)
- **Redis**: Caching and session management

## AI & Machine Learning
- **AI SDK**: @ai-sdk/openai 2.0.22, @ai-sdk/react 2.0.25
- **OpenAI**: GPT-4o-mini for chat, text-embedding-3-small for vectors (1536 dimensions)
- **pgvector**: Vector similarity search with PostgreSQL extension
- **Model Context Protocol**: @modelcontextprotocol/sdk 1.17.1 for AI agent orchestration

## Authentication System
- **NextAuth.js**: v5.0.0-beta.29 with Prisma adapter
- **Providers**: Credentials, Google OAuth, GitHub OAuth, Resend magic links
- **Security**: bcrypt password hashing, JWT sessions, email verification

## CSS Framework
- **Tailwind CSS**: v4.1.12 with PostCSS plugin
- **CSS Variables**: Enabled for theme customization
- **Styling**: New York design system with neutral base colors

## UI Component Library
- **shadcn/ui**: Radix UI primitives with custom styling
- **Radix UI**: Comprehensive primitive component library
- **React Hook Form**: 7.62.0 with Zod validation and resolvers

## Fonts & Icons
- **Fonts**: Geist Sans and Geist Mono from Google Fonts
- **Icons**: Lucide React (primary), @tabler/icons-react (supplementary)

## Key Libraries
- **Drag & Drop**: @dnd-kit (core, sortable, modifiers, utilities)
- **Charts**: Recharts 2.15.4 for dashboard analytics
- **Data Tables**: @tanstack/react-table 8.21.3
- **Date Handling**: date-fns 4.1.0, react-day-picker 9.8.1
- **State Management**: React Query/TanStack Query, nuqs for URL state
- **Email**: React Email components, Resend for transactional emails
- **Document Processing**:
  - **PDF**: pdf-parse 1.1.1
  - **Word**: mammoth 1.8.0
  - **Excel**: xlsx 0.18.5
  - **OCR**: tesseract.js 5.1.1
  - **CSV**: papaparse (implied from features)

## Application Hosting
- **Platform**: Vercel (inferred from Next.js 15 + deployment configuration)
- **Environment**: Production MVP with first users

## Database Hosting
- **PostgreSQL**: Production database with pgvector extension
- **Prisma Accelerate**: Extension support enabled

## Asset Hosting
- **Static Assets**: Next.js integrated asset handling
- **User Uploads**: Document processing pipeline with AI analysis

## Deployment Solution
- **Build System**: Node.js with 8GB memory allocation
- **Package Manager**: pnpm with turbopack for development
- **TypeScript**: Build-time type checking with strict configuration

## Development Tools
- **Testing**: Jest/Vitest configuration with AI system integration tests
- **Linting**: ESLint with Next.js configuration
- **Database Tools**: Prisma Studio, migration system, backup scripts
- **Monitoring**: AI metrics collection, security audit logs

## Code Repository
- **Git**: Version control with production data protection rules
- **Structure**: App Router with server actions, comprehensive component library
- **Standards**: TypeScript strict mode, server-first architecture