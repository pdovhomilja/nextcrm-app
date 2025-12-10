# NextCRM Technical Stack

This document outlines NextCRM's comprehensive technology stack, architectural decisions, and planned evolutions as we build the best Next.js open-source self-hosted CRM alternative.

---

## Overview

NextCRM is built on a modern, enterprise-grade stack that prioritizes:
- **Developer Experience**: TypeScript, Next.js, and modern tooling
- **Performance**: Server-side rendering, efficient data fetching, and caching
- **Reliability**: Comprehensive testing and type safety
- **AI-First Architecture**: RAG, LLM orchestration, and intelligent automation
- **Self-Hosting**: Complete control over infrastructure and data

---

## Frontend Stack

### Core Framework
- **Next.js 15**: Full-stack React framework with App Router, Server Components, and Server Actions
  - *Why*: Best-in-class developer experience, built-in optimizations, excellent TypeScript support
  - *Features Used*: App Router, Server Actions, API Routes, Middleware, Image Optimization

- **React 19**: Latest React with enhanced performance and concurrent features
  - *Why*: Cutting-edge UI library with hooks, concurrent rendering, and large ecosystem

- **TypeScript 5**: Strict type checking across entire codebase
  - *Why*: Catch errors at compile time, improved IDE support, self-documenting code
  - *Goal*: Zero 'any' types, strict mode enabled

### UI & Styling
- **Tailwind CSS 4**: Utility-first CSS framework for rapid UI development
  - *Why*: Consistent design system, small bundle sizes, excellent DX with JIT compilation

- **shadcn/ui**: High-quality, accessible React components built on Radix UI
  - *Why*: Unstyled, customizable primitives with excellent accessibility (ARIA compliant)
  - *Components*: Dialog, DropdownMenu, Select, Popover, Command, Sheet, Toast, Form, Table
  - *Goal*: Maximum utilization of shadcn components for consistency

- **Radix UI**: Headless component primitives for accessibility
  - *Why*: WAI-ARIA compliant, keyboard navigation, focus management

- **Tremor**: React library for building dashboards and data visualizations
  - *Why*: Beautiful charts out-of-the-box, built on Recharts, Tailwind integration
  - *Use Cases*: Sales analytics, pipeline reports, revenue forecasts

### State Management
- **Zustand**: Lightweight state management for client-side state
  - *Why*: Simple API, no boilerplate, excellent TypeScript support
  - *Use Cases*: UI state, global app settings, user preferences

- **Jotai**: Atomic state management for fine-grained reactivity
  - *Why*: Minimal re-renders, composable atoms, server-side rendering support
  - *Use Cases*: Form state, real-time updates, derived state

### Data Fetching
- **SWR (stale-while-revalidate)**: React hooks for data fetching with caching
  - *Why*: Automatic revalidation, optimistic UI, focus revalidation
  - *Use Cases*: Dashboard data, list views, auto-refreshing data

- **Axios**: HTTP client for API requests
  - *Why*: Interceptors, request cancellation, automatic transforms

- **Server Actions**: Next.js native server functions for mutations
  - *Why*: Type-safe, no API routes needed, progressive enhancement
  - *Use Cases*: Form submissions, CRUD operations

---

## Backend Stack

### Database (Current & Planned Migration)

**Current: MongoDB 7 + Prisma ORM**
- *Current State*: Mature MongoDB schema with Prisma client
- *Limitations*: Document model less ideal for relational CRM data, complex joins

**Planned: PostgreSQL 16 (MIGRATION PRIORITY)**
- *Why PostgreSQL*:
  - Superior relational data modeling for CRM entities (accounts → contacts → opportunities)
  - Advanced features: JSON columns, full-text search, trigrams, GIN indexes
  - Better performance for complex queries and aggregations
  - Wider ecosystem and tool support
  - Native vector support (pgvector) for AI/RAG features
  - Open-source with strong community

- *Migration Strategy*:
  - Phase 1: Design PostgreSQL schema with Prisma
  - Phase 2: Build data migration tooling (MongoDB → PostgreSQL)
  - Phase 3: Parallel writes during transition period
  - Phase 4: Switch reads to PostgreSQL, validate data
  - Phase 5: Deprecate MongoDB, rollback procedures

- **Prisma ORM**: Type-safe database client and migration tool
  - *Why*: Auto-generated TypeScript types, migration system, multi-database support
  - *Features*: Prisma Client, Prisma Migrate, Prisma Studio for debugging

### API Layer
- **Next.js API Routes**: RESTful endpoints using App Router route handlers
  - *Why*: Co-located with frontend, automatic TypeScript inference, middleware support

- **Server Actions**: Type-safe server functions called directly from components
  - *Why*: No API route boilerplate, progressive enhancement, automatic error handling

- **tRPC (Future Consideration)**: End-to-end typesafe APIs
  - *Evaluation*: May adopt for internal API if complexity grows

### Authentication & Authorization
- **NextAuth.js v5**: Authentication library for Next.js
  - *Providers*: Google OAuth, GitHub OAuth, Credentials (email/password)
  - *Features*: Session management, JWT tokens, database sessions
  - *Why*: Industry standard, secure defaults, extensible

- **Role-Based Access Control (RBAC)**: Custom permission system
  - *Implementation*: Database-stored roles and permissions
  - *Levels*: Organization admin, team lead, sales rep, viewer
  - *Future*: Field-level permissions, custom roles

---

## AI & RAG Stack

### Current AI Integration
- **OpenAI API (GPT-4)**: General-purpose language model
  - *Use Cases*: AI notifications, chat assistance, text generation
  - *Models*: GPT-4 Turbo, GPT-3.5 Turbo for cost optimization

- **Rossum API**: Specialized invoice parsing and data extraction
  - *Why*: Purpose-built for document processing, high accuracy
  - *Use Cases*: Invoice OCR, automated data entry

### Planned RAG Architecture (PHASE 2 PRIORITY)

**Vector Database**
- **Primary Option: pgvector (PostgreSQL extension)**
  - *Why*: Co-located with main database, simpler infrastructure, good performance
  - *Features*: Vector similarity search, index types (HNSW, IVFFlat)

- **Alternative: Pinecone / Weaviate**
  - *Consideration*: If pgvector performance insufficient at scale
  - *Evaluation Criteria*: Query latency < 100ms, support for 1M+ vectors

**Embeddings**
- **OpenAI text-embedding-3-large**: High-quality text embeddings (3072 dimensions)
  - *Why*: Best performance for semantic search, multilingual support
  - *Fallback*: text-embedding-3-small for cost optimization

- **Alternative: Sentence Transformers** (self-hosted)
  - *Models*: all-MiniLM-L6-v2, multi-qa-mpnet-base
  - *Why*: Zero external API costs, data privacy, offline capability

**LLM Orchestration**
- **LangChain**: Framework for building LLM applications
  - *Why*: RAG pipelines, prompt templates, memory management, tool integration
  - *Components*: Document loaders, text splitters, retrievers, chains

- **Alternative: LlamaIndex**
  - *Evaluation*: Simpler API for RAG-specific use cases

**Document Processing**
- **Chunking Strategy**: Semantic chunking for CRM entities
  - *Accounts*: Company info, industry, notes (max 1000 tokens/chunk)
  - *Contacts*: Person details, interaction history (max 500 tokens)
  - *Opportunities*: Deal details, stages, notes (max 800 tokens)

- **Metadata Enrichment**: Add filters for efficient retrieval
  - *Fields*: entity_type, created_date, owner_id, importance_score

**AI Features Enabled by RAG**
1. **AI Sales Assistant**: Natural language queries over CRM data
2. **Lead Generation**: Semantic matching of ideal customer profiles
3. **Data Enrichment**: Context-aware data completion
4. **Smart Search**: Semantic search across all CRM entities
5. **Duplicate Detection**: Embedding-based similarity matching
6. **Daily Digest**: Context-aware priority recommendations

---

## File Storage & Media

### Current Implementation
- **UploadThing**: Modern file upload solution for Next.js
  - *Why*: Simple API, built-in progress tracking, TypeScript support
  - *Free Tier*: Suitable for small deployments

- **AWS S3 Compatible (DigitalOcean Spaces)**
  - *Why*: Cost-effective, S3-compatible API, good performance
  - *Use Cases*: Production deployments, large file storage

### Configuration
- **Environment-Based**: Switch between UploadThing (dev) and S3 (production)
- **Features**: Pre-signed URLs, direct uploads, file versioning

---

## Email & Communication

### Email Delivery
- **Resend**: Modern transactional email API
  - *Why*: Developer-friendly, excellent deliverability, usage-based pricing
  - *Use Cases*: System notifications, password resets, alerts

- **React Email**: Build emails with React components
  - *Why*: Component reuse, type-safe templates, live preview
  - *Templates*: Welcome email, task reminders, digest emails

### Email Client
- **IMAP/SMTP Integration**: Direct email protocol support
  - *Libraries*: node-imap, nodemailer
  - *Features*: Inbox sync, send emails, conversation threading
  - *Use Cases*: Integrated email client within CRM

### Email Campaigns (Planned - Phase 3)
- **MailChimp API**: Marketing automation platform
  - *Why*: Industry standard, robust features, good documentation

- **Listmonk**: Self-hosted newsletter and mailing list manager
  - *Why*: Open-source, self-hosted, complete control
  - *Choice*: User can choose based on self-hosting preference

---

## Testing Stack (PHASE 1 PRIORITY)

### Current Testing
- **Cypress**: End-to-end testing framework
  - *Current*: Basic tests for critical flows
  - *Goal*: Comprehensive e2e coverage (80%+ of user journeys)

### Planned Testing Infrastructure

**End-to-End Testing**
- **Cypress** OR **Playwright**: Modern e2e testing frameworks
  - *Decision*: Evaluate both for cross-browser support, speed, DX
  - *Coverage Target*: 80%+ of critical user paths
  - *Test Suites*:
    - Authentication flows (login, registration, password reset)
    - CRM operations (create/read/update/delete for all entities)
    - Pipeline management (drag-drop, stage transitions)
    - Search functionality
    - AI assistant interactions
    - Email client operations

- **Cypress Features**: Time travel debugging, real-time reloading, network stubbing
- **Playwright Features**: Multi-browser (Chromium, Firefox, WebKit), parallelization, trace viewer

**Unit & Integration Testing**
- **Jest**: JavaScript testing framework with excellent TypeScript support
  - *Why*: Fast, parallel execution, snapshot testing, mocking
  - *Coverage Target*: 85%+ for business logic and utilities

- **React Testing Library**: Component testing focused on user behavior
  - *Why*: Tests how users interact with UI, encourages accessible code

- **Testing Utilities**:
  - **MSW (Mock Service Worker)**: API mocking for integration tests
  - **Testing Library User Event**: Simulate user interactions
  - **Faker.js**: Generate test data

**Test Organization**
```
tests/
├── e2e/              # Cypress/Playwright end-to-end tests
│   ├── auth/
│   ├── crm/
│   └── ai/
├── unit/             # Jest unit tests
│   ├── utils/
│   ├── api/
│   └── components/
└── integration/      # API integration tests
```

**CI/CD Testing**
- **GitHub Actions**: Automated test runs on every PR
- **Test Matrix**: Node 20.x, multiple browsers for e2e
- **Coverage Reports**: Codecov integration for visibility
- **Performance Budgets**: Fail if page load > 1s

---

## Development Tools

### Build & Package Management
- **pnpm**: Fast, disk-efficient package manager
  - *Why*: 3x faster than npm, symlinked node_modules, monorepo support

- **Turborepo (Planned - Phase 4)**
  - *Why*: Monorepo build system with caching and parallel execution
  - *Structure*:
    ```
    packages/
    ├── web/          # Main Next.js app
    ├── mobile/       # React Native app
    ├── core/         # Shared business logic
    ├── ui/           # Shared UI components
    └── config/       # Shared configs (ESLint, TypeScript)
    ```

### Code Quality
- **ESLint**: JavaScript/TypeScript linting
  - *Configs*: Next.js recommended, TypeScript strict, accessibility rules

- **Prettier**: Code formatting
  - *Why*: Consistent code style, zero-config, editor integration

- **Husky**: Git hooks for pre-commit checks
  - *Hooks*: Lint staged files, run type checking, format code

- **lint-staged**: Run linters on staged files only
  - *Why*: Fast pre-commit checks, only lint changed files

### Monitoring & Observability (Future)
- **Sentry**: Error tracking and performance monitoring
- **PostHog**: Product analytics and feature flags
- **Axiom**: Log aggregation and search

---

## Deployment & Infrastructure

### Containerization
- **Docker**: Containerized deployments with multi-stage builds
  - *Current*: Production-ready Docker image
  - *Features*: Environment-based configuration, health checks, security scanning

- **Docker Compose**: Local development and simple deployments
  - *Services*: Next.js app, PostgreSQL, Redis (future)

### Hosting Options (Self-Hosted)
Users can deploy NextCRM on:
- **Vercel**: Zero-config Next.js hosting (hobby/small teams)
- **DigitalOcean Droplets**: VPS with Docker (cost-effective)
- **AWS EC2 / ECS**: Enterprise-grade with auto-scaling
- **Google Cloud Run**: Serverless containers
- **Azure Container Instances**: Hybrid cloud support
- **Self-Hosted Kubernetes**: Large-scale deployments

### Infrastructure Components (Planned)
- **Redis**: Caching layer for sessions, API responses
  - *Why*: Sub-millisecond latency, pub/sub for real-time features

- **PostgreSQL**: Primary database (post-migration)
  - *Configuration*: Connection pooling (PgBouncer), read replicas for scale

- **Nginx**: Reverse proxy for load balancing and SSL termination
  - *Why*: Handle static files, rate limiting, security headers

---

## Internationalization

- **next-intl**: Internationalization library for Next.js
  - *Why*: App Router support, type-safe translations, server/client rendering
  - *Features*: Number formatting, date formatting, pluralization, RTL support

- **Languages** (Phase 1 Goal):
  - English (en)
  - Spanish (es)
  - German (de)
  - French (fr)
  - Japanese (ja)

- **Translation Management**: JSON files with nested keys for organization

---

## Security

### Current Implementation
- **NextAuth.js**: Secure authentication with industry best practices
- **HTTPS**: Enforced in production
- **Environment Variables**: Secrets stored securely, never committed
- **CORS**: Configured for API routes
- **Rate Limiting**: Basic implementation on API routes

### Planned Security Enhancements
- **Helmet.js**: Security headers (CSP, HSTS, X-Frame-Options)
- **SQL Injection Protection**: Prisma parameterized queries
- **XSS Prevention**: React automatic escaping, DOMPurify for rich text
- **CSRF Protection**: Built into Server Actions
- **Audit Logging**: Track all data modifications (Phase 3)
- **Encryption at Rest**: Database-level encryption (enterprise deployments)
- **SSO/SAML**: Enterprise identity integration (Phase 4)

---

## Performance Optimization Stack

### Current Optimizations
- **Next.js Image Optimization**: Automatic image resizing, WebP conversion
- **Code Splitting**: Automatic route-based splitting
- **Server Components**: Reduce client-side JavaScript
- **SWR Caching**: Deduplicated requests, stale-while-revalidate

### Planned Optimizations (Phase 4)
- **Redis Caching**: API response caching, session storage
  - *TTL Strategy*: 5 min for list views, 1 min for real-time data

- **Database Indexing**: Strategic indexes on frequently queried fields
  - *Priority*: Foreign keys, search fields, filter columns

- **Query Optimization**: Analyze slow queries with EXPLAIN, optimize N+1 problems
- **CDN**: CloudFlare for static assets and global edge caching
- **Lazy Loading**: Virtual scrolling for large lists (React Virtuoso)
- **Bundle Analysis**: webpack-bundle-analyzer to identify large dependencies

**Performance Targets**:
- **Page Load**: < 1 second (First Contentful Paint)
- **API Response**: < 100ms for simple queries, < 500ms for complex
- **Database Queries**: < 50ms for indexed lookups
- **Build Time**: < 5 minutes for production builds

---

## Technology Decision Framework

When evaluating new technologies for NextCRM, we consider:

1. **Open Source**: Prefer open-source with active communities
2. **Self-Hosting**: Must support self-hosted deployments
3. **TypeScript Support**: First-class TypeScript integration required
4. **Developer Experience**: Clear documentation, good DX
5. **Performance**: Benchmarks and production-proven at scale
6. **Maintenance**: Active development, security updates
7. **Community**: Large ecosystem, available plugins/extensions
8. **Cost**: Transparent pricing, no vendor lock-in
9. **Enterprise-Ready**: Production deployments, security features
10. **AI-Friendly**: Integration with LLM and RAG workflows

---

## Migration Priorities Summary

**Immediate (Q1-Q2 2025)**:
1. MongoDB → PostgreSQL migration (TOP PRIORITY)
2. Comprehensive testing infrastructure (Jest + Cypress/Playwright)
3. TypeScript strict mode (eliminate 'any' types)
4. Maximum ShadCN UI component usage

**Near-Term (Q2-Q3 2025)**:
5. RAG infrastructure (pgvector + LangChain)
6. Redis caching layer
7. Advanced monitoring (Sentry, PostHog)

**Long-Term (Q4 2025+)**:
8. Turborepo monorepo structure
9. React Native mobile app
10. Enterprise SSO/SAML
11. High availability / clustering

---

## Contributing to Tech Stack

We welcome contributions that:
- Improve developer experience
- Enhance performance or reliability
- Add well-justified new capabilities
- Align with our AI-first, self-hosted, open-source mission

Before proposing major technology changes, please:
1. Open a GitHub Discussion to explain the rationale
2. Provide benchmarks or proof-of-concept
3. Consider impact on self-hosting complexity
4. Ensure backward compatibility or migration path

---

## Conclusion

NextCRM's technology stack is intentionally chosen to support our mission of becoming the best Next.js open-source self-hosted CRM alternative. Every decision prioritizes developer experience, enterprise quality, AI-first architecture, and user data sovereignty.

As we execute our roadmap, this stack will evolve—but always with our core principles guiding each choice.
