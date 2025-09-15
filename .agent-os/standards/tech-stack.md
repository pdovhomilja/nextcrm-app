# Tech Stack

## Context

Global tech stack defaults for Agent OS projects, overridable in project-specific `.agent-os/product/tech-stack.md`.

- App Framework: Next.js 15.0+
- Language: TypeScript 5.0+
- Primary Database: PostgreSQL 17+
- ORM: Prisma
- JavaScript Framework: Next.js 15+ with React 19 App Router
- Build Tool: Next.js
- Import Strategy: Node.js modules
- Package Manager: pnpm
- Node Version: 22 LTS
- CSS Framework: TailwindCSS 4.0+ (with shadcn/ui)
- UI Components: Shadcn UI latest
- UI Installation: Via development pnpm group
- Font Provider: Geist Fonts
- Font Loading: Self-hosted for performance
- Icons: Lucide React components (with shadcn/ui)
- Application Hosting: My own Managed Coolify
- Hosting Region: Primary region based on user base
- Database Hosting: My own Managed PostgreSQL
- Database Backups: Daily automated
- Email Service: Resend
- Asset Storage: My own Managed S3
- CDN: CloudFront
- Asset Access: Private with signed URLs
- CI/CD Platform: GitHub Actions
- CI/CD Trigger: Push to main/staging branches
- Tests: Run before deployment
- Production Environment: main branch
- Staging Environment: staging branch
