# Mem0 + OpenClaw + VenSai CRM

Two layers share the **same Mem0 API key** but run in different runtimes:

| Layer | Package | Where it runs | What it remembers |
| ----- | ------- | ------------- | ----------------- |
| **OpenClaw agent** | `@mem0/openclaw-mem0` | Your machine (`~/.openclaw`) | Personal agent chats (Telegram, desktop, coding agents) |
| **VenSai CRM app** | `mem0ai` (`lib/mem0/`) | Next.js server actions | Per-user CRM assistant, email compose AI, campaign templates |

## OpenClaw plugin (local agent)

Install (requires `--force` for npm registry plugins outside ClawHub review):

```bash
npx openclaw@latest plugins install @mem0/openclaw-mem0 --force
```

Activate memory slot — either chat setup (`Setup Mem0 from mem0.ai/claw-setup`) or:

```bash
openclaw mem0 init --api-key <MEM0_API_KEY> --user-id <your-stable-id>
```

Or merge into `%USERPROFILE%\.openclaw\openclaw.json`:

```json
{
  "plugins": {
    "slots": { "memory": "openclaw-mem0" },
    "entries": {
      "openclaw-mem0": {
        "enabled": true,
        "config": {
          "apiKey": "${MEM0_API_KEY}",
          "userId": "your-stable-id",
          "skills": {
            "triage": { "enabled": true },
            "recall": {
              "enabled": true,
              "tokenBudget": 1500,
              "rerank": true,
              "keywordSearch": true,
              "identityAlwaysInclude": true
            },
            "domain": "companion"
          }
        }
      }
    }
  }
}
```

Verify: `openclaw mem0 status`

Useful when OpenClaw helps you **develop or operate** this repo (MCP, terminal, multi-session) — it recalls preferences across days without stuffing `AGENTS.md`.

## CRM in-app memory (`MEM0_API_KEY`)

Set in `.env.local` / Vercel (see `.env.local.example`):

- `MEM0_API_KEY` — from [app.mem0.ai](https://app.mem0.ai)
- Optional `MEM0_USER_ID_PREFIX` — defaults to `nextcrm:<user-uuid>` per signed-in user

### Wired surfaces

1. **`actions/assistant/handle-assistant-message.ts`** — VenSai assistant sheet: recalls facts before `completeChat`, stores each Q&A turn.
2. **`actions/emails/generate-compose-email.ts`** — Mailbox AI writer: tone, signature habits, recurring phrasing.
3. **`actions/campaigns/templates/generate-template.ts`** — Campaign HTML generator: brand voice and past campaign patterns.
4. **LinkedIn funnel** — `lib/linkedin/ai-intelligence.ts` surfaces `linkedin-icp` + `lead-qualification`; ICP saved from Admin → LinkedIn.

If `MEM0_API_KEY` is unset, all three paths behave exactly as before (no latency, no errors).

### Shared memory tip

Use the **same Mem0 project** for OpenClaw and CRM if you want one knowledge graph; use different `userId` / `nextcrm:` prefixes so personal agent memories do not mix with CRM user accounts unless intentional.
