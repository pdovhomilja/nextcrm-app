# README + SKILL.md Update Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update README.md to reflect better-auth and 127 MCP tools, create a static SKILL.md for Claude Code users, and add a download link in the Developer tab.

**Architecture:** Three file changes — README.md edit, new `public/SKILL.md` static file, and DeveloperTabContent update with download link.

**Tech Stack:** Markdown, Next.js static file serving, React Server Components

---

### Task 1: Update README.md — Auth References

**Files:**
- Modify: `README.md:152-153` (Tech Stack Frameworks section)
- Modify: `README.md:266` (.env.local section)

- [ ] **Step 1: Replace next-auth with Better Auth in Frameworks list**

Change line 153 from:
```
- [next-auth 4.x](https://next-auth.js.org/) – Handle user authentication with ease with providers like Google, GitHub, and Credentials
```
To:
```
- [Better Auth 1.5.x](https://www.better-auth.com/) – TypeScript-first authentication framework with email OTP, OAuth (Google), admin plugin, and session management
```

- [ ] **Step 2: Update .env.local reference**

Change line 266 from:
```
   > > - NextAUTH - for auth
```
To:
```
   > > - BETTER_AUTH_SECRET - for auth
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: replace next-auth with better-auth in README"
```

---

### Task 2: Update README.md — MCP Section

**Files:**
- Modify: `README.md:96-117` (MCP Server section in What's New)
- Modify: `README.md:169` (MCP entry in Tech Stack)

- [ ] **Step 1: Update MCP Server section in What's New**

Replace the current MCP section (lines 96-117) with updated tool count and full module list:

```markdown
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
```

- [ ] **Step 2: Update Tech Stack MCP line**

Change line 169 from:
```
- [MCP Server](https://modelcontextprotocol.io/) – 25 CRM tools via `@vercel/mcp-adapter`, Bearer token auth, SSE + HTTP transports
```
To:
```
- [MCP Server](https://modelcontextprotocol.io/) – 127 tools across 15 modules via `@vercel/mcp-adapter`, Bearer token auth, SSE + HTTP transports
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update MCP section with 127 tools across 15 modules"
```

---

### Task 3: Create public/SKILL.md

**Files:**
- Create: `public/SKILL.md`

- [ ] **Step 1: Create the SKILL.md file**

Create `public/SKILL.md` with Claude Code skill frontmatter, connection instructions, auth setup, and the full 127-tool reference grouped by module. Each tool entry includes its exact name and description.

The file should include:
- Frontmatter: `name: nextcrm`, `description`, `type: mcp`
- Connection config for SSE + HTTP
- Auth instructions (Bearer token from profile)
- All 15 modules with every tool name and description
- Usage examples for common workflows

- [ ] **Step 2: Commit**

```bash
git add public/SKILL.md
git commit -m "feat: add SKILL.md for Claude Code MCP integration"
```

---

### Task 4: Add Download Link in Developer Tab

**Files:**
- Modify: `app/[locale]/(routes)/profile/components/tabs/DeveloperTabContent.tsx`

- [ ] **Step 1: Add SKILL.md download section**

Add a new card below the API Tokens card with:
- Title: "Claude Code Skill"
- Description explaining what it is
- Download link pointing to `/SKILL.md` (served from public/)
- Copy-to-clipboard for MCP config JSON snippet

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/(routes)/profile/components/tabs/DeveloperTabContent.tsx
git commit -m "feat: add SKILL.md download to Developer tab"
```
