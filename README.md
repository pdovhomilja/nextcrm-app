<a href="https://nextcrm.app/">
  <h1 align="center">NextCRM</h1>
</a>

<p align="center">
<img alt="OG" src="public/images/opengraph-image.png" />
</p>

<p align="center">
NextCRM is an open-source CRM built with Next.js 16, React 19, TypeScript, PostgreSQL (Prisma 7), and shadcn/ui. Features CRM, project management, document storage, email client, AI-powered features, vector search, and MCP server for AI agent access.
</p>

<p align="center">
<a href="https://twitter.com/nextcrmapp">
<img alt="X (formerly Twitter) URL" src="https://img.shields.io/twitter/url?url=https%3A%2F%2Ftwitter.com%2Fnextcrmapp">
</a>
  <a href="https://github.com/pdovhomilja/nextcrm-app/blob/main/LICENSE">
    <img alt="GitHub License" src="https://img.shields.io/github/license/pdovhomilja/nextcrm-app">
  </a>
</p>

<p align="center">
   <a href="#online-demo"><strong>Introduction</strong></a> ·
   <a href="#whats-new"><strong>What's New</strong></a> ·
   <a href="#tech-stack--features"><strong>Tech Stack + Features</strong></a> ·
   <a href="#roadmap"><strong>Roadmap</strong></a> ·
   <a href="#installation"><strong>Installation</strong></a> ·
   <a href="#repo-activity"><strong>Repo activity</strong></a> ·
   <a href="#license"><strong>License</strong></a> ·
   <a href="https://discord.gg/dHyxhTEyUb"><strong>Discord</strong></a>
</p>
<br/>

## Online Demo

You can try it here [demo.nextcrm.io](https://demo.nextcrm.io), login via Google account or create new user and password.

---

## What's New

### 📋 CRM Activities — Full Activity Tracking *(NEW)*

All 5 CRM entity detail pages (Accounts, Contacts, Leads, Opportunities, Contracts) now have an **Activities** tab with a live paginated feed of interactions:

- **Activity types** — Notes, Calls, Emails, Meetings, Tasks
- **Create / edit / delete** — inline Sheet form on every CRM entity detail page
- **Paginated feed** — compound cursor pagination with `createdAt + id` for stable ordering
- **Linked records** — activities attach to multiple entities via `crm_ActivityLinks` (e.g. a call can reference both a Contact and an Opportunity)
- **Real-time revalidation** — server actions revalidate the correct path after every mutation

---

### 🕵️ Audit Log & History — Full Change Trail *(NEW)*

Every CRM entity (Accounts, Contacts, Leads, Opportunities, Contracts) now tracks its full change history:

- **History tab** — per-entity timeline of all field changes, shown on every detail page with `AuditTimeline` + `AuditEntry` components
- **Soft delete** — records are never hard-deleted; `deletedAt` column preserves data while hiding it from normal queries
- **Admin audit log** — `/admin/audit-log` shows a global filterable table of every change across all entities, with restore support for soft-deleted records
- **Diff engine** — `diffObjects` utility computes before/after diffs and stores structured JSON in the audit record

---

### 🧠 AI Enrichment — E2B Sandboxed Agent + Flexible API Key Management *(NEW)*

Target and Contact enrichment now runs inside an **[E2B](https://e2b.dev/) cloud sandbox** — a full Linux environment with a real browser (Chrome) — replacing the previous Firecrawl API path:

- **Real-browser research** — the agent navigates JS-heavy sites, LinkedIn public profiles, and paginated results that a simple API call cannot reach
- **LLM tool-use loop** — Claude Sonnet 4.6 drives the research with tools: `browser_open`, `browser_snapshot`, `browser_click`, `browser_extract`, `web_search`
- **C-level contact discovery** — given only a company name, the agent finds all discoverable C-level contacts and creates `crm_Target_Contact` records automatically
- **Context-aware strategy** — agent skips research it doesn't need (e.g. already has a website → skips domain discovery)
- **Confidence scoring** — fields below 0.6 confidence are discarded; only empty target fields are overwritten
- **5-minute timeout per target** — partial results are applied even if the agent times out
- **Fan-out** — after company enrichment, each discovered contact is enriched independently via a separate Inngest job

**API keys** are managed through a **3-tier priority system** so the app runs without any keys in `.env`:

```
ENV variable  →  Admin system-wide  →  User profile
(highest)                              (lowest)
```

- **Admin panel** (`/admin/llm-keys`) — set system-wide keys for OpenAI, Firecrawl, Anthropic, and Groq. Keys are encrypted at rest (AES-256-GCM).
- **Profile settings** (`/profile?tab=llms`) — users configure their own keys as a fallback.
- **Graceful degradation** — enrichment buttons show an informative dialog when no key is available at any tier.

> **Migration note:** The old `openAi_keys` table is replaced by the new `ApiKeys` table. Run `pnpm prisma migrate deploy` to apply the migration.

---

### 🤖 MCP Server — AI Agent Access to CRM Data *(NEW)*

NextCRM now ships with a built-in [Model Context Protocol](https://modelcontextprotocol.io/) server, letting AI agents (Claude, Cursor, custom agents) read and write CRM data directly.

**127 tools across 15 modules:**

| Module | Tools | Operations |
|--------|-------|------------|
| Accounts | 6 | list, get, search, create, update, delete |
| Contacts | 6 | list, get, search, create, update, delete |
| Leads | 6 | list, get, search, create, update, delete |
| Opportunities | 6 | list, get, search, create, update, delete |
| Targets | 6 | list, get, search, create, update, delete |
| Products | 5 | list, get, create, update, delete |
| Contracts | 5 | list, get, create, update, delete |
| Activities | 5 | list, get, create, update, delete |
| Documents | 8 | list, get, create, upload, download, link, unlink, delete |
| Target Lists | 7 | list, get, create, update, delete, add members, remove members |
| Enrichment | 4 | enrich contact, enrich target, bulk contact, bulk target |
| Email Accounts | 1 | list |
| Campaigns | 18 | full lifecycle: CRUD, send, pause, resume, templates, steps, stats |
| Projects | 18 | boards, sections, tasks, comments, documents, watch |
| Reports | 2 | list, run |

**Authentication:** Generate Bearer tokens (`nxtc__...`) from your profile page. Tokens are SHA-256 hashed — the raw value is shown only once and never stored.

**Connect your MCP client:**
```json
{
  "mcpServers": {
    "nextcrm": {
      "url": "https://your-nextcrm.com/api/mcp/sse",
      "headers": { "Authorization": "Bearer nxtc__your_token_here" }
    }
  }
}
```

Both SSE (`/api/mcp/sse`) and HTTP (`/api/mcp/http`) transports are supported.

**Claude Code Skill:** Download the [SKILL.md](/en/profile?tab=developer) from your Developer profile tab for a ready-to-use Claude Code skill with full tool documentation.

---

### 🔍 Vector Search + Semantic Similarity *(NEW)*

CRM records (Accounts, Contacts, Leads, Opportunities) are automatically embedded using **OpenAI `text-embedding-3-small`** via [Inngest](https://www.inngest.com/) background jobs.

- **Unified search** — combines keyword (full-text) + semantic (pgvector cosine similarity) results in a single grouped UI
- **Find Similar** — every CRM detail page has a "Find Similar" button that surfaces semantically related records across the same module
- **Backfill** — Inngest function to embed all existing records on demand
- **Auto-embed** — new and updated records are embedded automatically

Powered by **pgvector** (PostgreSQL extension) with HNSW indexes for fast approximate nearest-neighbor search.

---

### 🎯 CRM Targets *(NEW)*

New **Targets** module for managing sales targets and target lists — full CRUD, detail view, list management, and MCP tools included.

---

### 🔎 Unified Search *(NEW)*

Global search across all CRM entities from a single search bar — grouped results by entity type, loading skeleton, collapsible sections, and combined keyword + semantic scoring.

---

## Tech Stack + Features

### Frameworks

- [Next.js 16](https://nextjs.org/) – React framework for building performant apps with the best developer experience (App Router)
- [Better Auth 1.5.x](https://www.better-auth.com/) – TypeScript-first authentication framework with email OTP, OAuth (Google), admin plugin, and session management
- [Prisma 7.5](https://www.prisma.io/) – TypeScript-first ORM for PostgreSQL
- [React Email 2.x](https://react.email/) – Versatile email framework for efficient and flexible email development

### Platforms

- [PostgreSQL 17+](https://www.postgresql.org/) – Powerful open-source relational database with **pgvector** extension for AI embeddings
- [Resend](https://resend.com/) – A powerful email framework for streamlined email development together with [react.email](https://react.email)
- [UploadThing](https://uploadthing.com/) + S3-compatible storage (DigitalOcean Spaces) – for document file storage
- [Inngest](https://www.inngest.com/) – Background job queue for async embedding and AI workflows

### AI & MCP

- [OpenAI API](https://openai.com/blog/openai-api) – `text-embedding-3-small` for vector embeddings; GPT for project management assistant
- [Anthropic API](https://www.anthropic.com/) – Claude Sonnet 4.6 drives the E2B enrichment agent tool-use loop
- [Vercel AI SDK 6.x](https://sdk.vercel.ai/) – Unified AI interface
- [pgvector](https://github.com/pgvector/pgvector) – PostgreSQL vector extension for similarity search (HNSW indexes)
- [E2B](https://e2b.dev/) – Cloud sandboxes with real Chrome browser for AI-driven web research and contact enrichment
- [MCP Server](https://modelcontextprotocol.io/) – 127 tools across 15 modules via `@vercel/mcp-adapter`, Bearer token auth, SSE + HTTP transports

### Data fetching

- [SWR](https://swr.vercel.app/) – React Hooks library for remote data fetching
- [Axios](https://axios-http.com/) – Promise based HTTP client for the browser and node.js
- [Server Actions]() – for server side data fetching and mutations
- [TanStack React Table](https://tanstack.com/table) – for data tables and server/client side data fetching

### UI

- [Tailwind CSS v4](https://tailwindcss.com/) – Utility-first CSS framework for rapid UI development
- [shadcn/ui](https://ui.shadcn.com/) – Re-usable components built using Radix UI and Tailwind CSS
- [Tremor](https://www.tremor.so/) – A platform for creating charts
- [Lucide React](https://lucide.dev/) – Beautiful and consistent open-source icons

### i18n

- [next-intl](https://next-intl-docs.vercel.app/) – Internationalization for Next.js — English, Czech, German, Ukrainian

![hero](/public/og.png)

## Roadmap

1. ✅ Docker version — complete bundle to run NextCRM on-premise
2. ✅ Upgrade to Next.js 16 — running on Next.js 16 with React 19
3. ✅ i18n / localization — 4 languages (English, Czech, German, Ukrainian)
4. ✅ Email client — IMAP/SMTP email client built in
5. ✅ PostgreSQL migration — migrated from MongoDB to PostgreSQL 17+
6. ✅ pgvector embeddings — automatic semantic embeddings via Inngest + OpenAI
7. ✅ Vector similarity search — "Find Similar" on all CRM entity detail pages
8. ✅ Unified search — keyword + semantic search across all CRM modules
9. ✅ CRM Targets module — sales target and target list management
10. ✅ MCP server — 25 CRM tools for AI agent access via Bearer token auth
11. ✅ AI enrichment — E2B sandboxed agent (real browser + Claude Sonnet) for target/contact enrichment; C-level contact discovery; 3-tier API key management (ENV → admin → user)
12. ✅ Audit log & history — soft delete + full field-level change trail on all CRM entities; global admin audit log page
13. ✅ CRM Activities — notes, calls, emails, meetings, tasks linked to any CRM entity; paginated feed on all detail pages
14. 🔄 More AI powered features — daily summary of tasks and projects
15. 📋 Email campaigns management — integration with MailChimp and Listmonk
16. 📋 Testing expansion — Jest + Playwright coverage (contributions welcome!)
17. 🔄 Fix all TypeScript `any` types — ongoing cleanup

## Emails

We use [resend.com](https://resend.com) + [react.email](https://react.email) as primary email sender and email templates.

## Reports

We use Tremor charts as a tool for creating charts in NextCRM

![hero](/public/reports.png)

## Video (YouTube channel with functions showcase)

[Youtube Channel](https://www.youtube.com/@NextCRM_IO) </br>
[Invoice module (video)](https://youtu.be/NSMsBMy07Pg)

## Documentation

Available soon at: http://docs.nextcrm.io

## Installation

<details><summary><b>Show instructions</b></summary>

1. Clone the repository:

   ```sh
   git clone https://github.com/pdovhomilja/nextcrm-app.git
   cd nextcrm-app
   ```

1. Install the preset:

   ```sh
   pnpm install
   ```

1. Copy the environment variables to .env

   ```sh
   cp .env.example .env
   ```

   ```sh
   cp .env.local.example .env.local
   ```

   **.env**

   > > - You will need a PostgreSQL connection string for Prisma ORM
   > > - Example: `DATABASE_URL="postgresql://user:pass@localhost:5432/nextcrm?schema=public"`
   > > - Requires PostgreSQL 17+ with the **pgvector** extension enabled

   **.env.local**

   > > - BETTER_AUTH_SECRET - for auth
   > > - uploadthings - for storing files
   > > - openAI - for embeddings and project management assistant *(optional — can be set via admin panel instead)*
   > > - Firecrawl - for contact/target enrichment *(optional — can be set via admin panel instead)*
   > > - SMTP and IMAP for emails
   > > - Inngest - for background embedding jobs
   > > - `EMAIL_ENCRYPTION_KEY` - required for encrypting API keys stored in the database

1. Init Prisma

   ```sh
    pnpm prisma generate
    pnpm prisma migrate deploy
   ```

1. Import initial data from initial-data folder

   ```sh
   pnpm prisma db seed
   ```

1. Run app on local

   ```sh
   pnpm run dev
   ```

1. http://localhost:3000

</details>

## Docker installation

[Link to Docker HUB](https://hub.docker.com/repository/docker/nextcrmio/nextcrm/general)

<details>
<summary><b>Show instructions</b></summary>

1. Make sure you have docker and docker-compose installed

2. Prepare .env and .env.local files

   ```create
   .env (for Prisma URI string) and .env.local (all others ENVs) file inside docker folder
   ```

3. build docker image

   ```sh
   docker build -t nextcrm .
   ```

4. Run docker container

   ```sh
   docker run -p 3000:3000 nextcrm
   ```

5. http://localhost:3000
</details>

## Contact

[www.dovhomilja.cz](https://www.dovhomilja.cz)
</br>
[<img alt="X (formerly Twitter) URL" src="https://img.shields.io/twitter/url?url=https%3A%2F%2Ftwitter.com%2Fdovhomilja">
](https://twitter.com/dovhomilja)

## Contributing

We are open to the NextCRM community contributions. Every contribution is welcome.

### Issues

- [Open an issue](https://github.com/pdovhomilja/nextcrm-app/issues) if you find a bug or have a suggestion for improvements.

### NextCRM Super heroes

<a href="https://github.com/pdovhomilja/nextcrm-app/graphs/contributors">
<img src="https://contrib.rocks/image?repo=pdovhomilja/nextcrm-app" />
</a>

Made with [contrib.rocks](https://contrib.rocks).

## Repo Activity

![Alt](https://repobeats.axiom.co/api/embed/e6bed6e15724f38c278ad2edcf0573a1bb24bed6.svg "Repobeats analytics image")

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=pdovhomilja/nextcrm-app&type=Timeline)](https://star-history.com/#pdovhomilja/nextcrm-app&Timeline)

## License

Licensed under the [MIT license](https://github.com/pdovhomilja/nextcrm-app/blob/main/LICENSE.md).
