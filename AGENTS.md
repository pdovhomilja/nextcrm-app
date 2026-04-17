# AGENTS.md

This file is the authoritative guide for AI agents (Claude Code and other LLM agents) working in the `nextcrm-app` project. It covers context management, available superpowers/skills, current repo status, and available MCP servers.

---

## 1. Context-Mode

**What it is**: The `context-mode` MCP plugin intercepts large tool outputs and stores them in a local FTS5 SQLite sandbox, returning only a compact reference instead of flooding the context window.

### Tool Hierarchy

| Priority | Tool                                                                      | Use When                                                             |
| -------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1        | `mcp__plugin_context-mode_context-mode__ctx_batch_execute`                | Primary research — runs commands, auto-indexes, searches in one call |
| 2        | `mcp__plugin_context-mode_context-mode__ctx_search`                       | Follow-up questions — pass multiple queries in one call              |
| 3        | `mcp__plugin_context-mode_context-mode__ctx_execute` / `ctx_execute_file` | Data processing, API calls, large log analysis                       |

### Forbidden Actions

- **Never** use `Bash` for commands producing >20 lines of output
- **Never** use `Read` for analysis (use `ctx_execute_file` instead; `Read` is correct only for files you intend to `Edit`)
- **Never** use `WebFetch` — use `ctx_fetch_and_index` instead

### Trigger Commands

| Command        | Action                                                                            |
| -------------- | --------------------------------------------------------------------------------- |
| `/ctx-stats`   | Call `ctx_stats` MCP tool, display output verbatim                                |
| `/ctx-doctor`  | Call `ctx_doctor` MCP tool, execute returned shell command, display as checklist  |
| `/ctx-upgrade` | Call `ctx_upgrade` MCP tool, execute returned shell command, display as checklist |

---

## 2. Superpowers (Skills System)

**What it is**: The `.claude/skills/` directory contains `SKILL.md` files that define rigid and flexible agent behaviors.

**Core rule**: Check for applicable skills **before** any response. Invoke via the `Skill` tool.

**Priority order**: User instructions > Superpowers skills > Default behavior

### Available Skills

| Skill                          | Path                                             | Type     |
| ------------------------------ | ------------------------------------------------ | -------- |
| using-superpowers              | `.claude/skills/using-superpowers/`              | Rigid    |
| brainstorming                  | `.claude/skills/brainstorming/`                  | Rigid    |
| test-driven-development        | `.claude/skills/test-driven-development/`        | Rigid    |
| systematic-debugging           | `.claude/skills/systematic-debugging/`           | Rigid    |
| writing-plans                  | `.claude/commands/write-plan.md`                 | Flexible |
| executing-plans                | `.claude/skills/executing-plans/`                | Flexible |
| dispatching-parallel-agents    | `.claude/skills/dispatching-parallel-agents/`    | Flexible |
| subagent-driven-development    | `.claude/skills/subagent-driven-development/`    | Flexible |
| using-git-worktrees            | `.claude/skills/using-git-worktrees/`            | Flexible |
| finishing-a-development-branch | `.claude/skills/finishing-a-development-branch/` | Flexible |
| requesting-code-review         | `.claude/skills/requesting-code-review/`         | Flexible |
| receiving-code-review          | `.claude/skills/receiving-code-review/`          | Flexible |

---

## 3. Prisma Decimal Serialization

**Problem**: Prisma returns `Decimal` objects for decimal/numeric columns. These are **not serializable** across the React Server Action boundary or when passing data to Client Components. Symptoms include: silent failures, `undefined` return values, hydration mismatches, or broken `router.push()` after a server action call.

**Solution**: Always use `serializeDecimals()` from `lib/serialize-decimals.ts`.

```ts
import { serializeDecimals } from "@/lib/serialize-decimals";

// Single object — wraps Prisma result before returning from server actions
return serializeDecimals(invoice);

// Lists — use serializeDecimalsList for arrays
import { serializeDecimalsList } from "@/lib/serialize-decimals";
return serializeDecimalsList(invoices);
```

**When to apply**:
- Every server action (`"use server"`) that returns a Prisma object containing Decimal fields
- Every Server Component that passes Prisma objects with Decimal fields as props to Client Components
- Any data crossing the server → client boundary where the Prisma model has `Decimal` columns

**Do NOT** strip returns to `{ id }` only — use `serializeDecimals()` so the full object remains available to the caller.

---
