# AI setup — VenSai CRM

## Which AI for which feature

| Feature | Providers | Notes |
|---------|-----------|--------|
| **Campaign email generate** | Groq → OpenRouter (free) → Gemini → OpenAI, then optional **Gemini polish** + **OpenAI JSON refine** | Main copywriting workflow |
| **Mailbox compose / reply** | Same stack via `quick-copy` task (`generate-compose-email`) | E-mails → Compose, Reply, ✨ AI reply |
| **VenSai Assistant** (header ✨) | Text: Groq → OpenRouter → Gemini chain; **images:** Gemini vision (`GEMINI_API_KEY`) | Opens compose, team DM, or app routes from natural language |
| **Search / Cmd+K vectors** | OpenAI embeddings only | Do not swap without a migration |
| **Contact enrichment** | OpenAI + Firecrawl | Admin / Profile keys |
| **Target enrichment (browser)** | Anthropic + E2B | Heavy research |

**Groq ≠ Grok (xAI).** This app uses **Groq** (`GROQ_API_KEY`). xAI Grok is not wired.

## Quality modes (Campaign → Generate with AI)

| Mode | Speed | Providers | Polish | OpenAI JSON refine | Hero image |
|------|-------|-----------|--------|-------------------|------------|
| **Fast** | Fastest | Groq → OpenRouter free | No | No | No |
| **Good** | Balanced (default) | Groq → OpenRouter → Gemini | No | No | Optional |
| **Better** | Slower | Full chain | Gemini yes | No | Optional |
| **Best** | Slowest | Gemini → OpenAI first | Yes | Yes | Optional (higher quality prompt) |

Hero images use OpenRouter `POST /api/v1/images` (default model `google/gemini-2.5-flash-image`). Override with `LLM_OPENROUTER_IMAGE_MODEL`. Many image models are **paid** on OpenRouter — pick a $0 model from [image models](https://openrouter.ai/models?output_modalities=image) if available.

**Free text models** (copy exact ids from your OpenRouter “Free” filter):

**Groq** (Oct 2026): `llama-3.1-8b-instant` is retired — app tries `openai/gpt-oss-20b`, `qwen/qwen3.8-27b`, `openai/gpt-oss-120b`. Override with `LLM_GROQ_MODELS`.

**Gemini**: tries `gemini-2.5-flash`, then `gemini-2.0-flash`, `gemini-1.5-flash`. Override with `LLM_GEMINI_MODELS`.

**OpenRouter free — built-in try-order** (no env needed):

1. `meta-llama/llama-3.3-70b-instruct:free`
2. `qwen/qwen-2.5-72b-instruct:free`
3. `mistralai/mistral-small-3.1-24b-instruct:free`
4. `deepseek/deepseek-r1-distill-llama-70b:free`
5. `google/gemini-2.0-flash-exp:free` (when available on free tier)
6. `google/gemini-2.0-flash-lite-preview-02-05:free`

Override or extend via:

```env
LLM_OPENROUTER_FREE_MODELS=google/gemini-2.0-flash-exp:free,meta-llama/llama-3.3-70b-instruct:free,...
```

Add any extra ids from your OpenRouter **Free** filter (Venice, Nemotron, etc.) to the env var or ask us to append them to `DEFAULT_OPENROUTER_FREE_MODELS` in code.

## Combination workflow (campaign emails)

When **`GEMINI_API_KEY`** is set (or `LLM_WORKFLOW=1`):

1. **Draft** — first success in chain: `groq` → `openrouter` → `gemini` → `openai`
2. **Polish** — Gemini tightens tone (skipped if draft already came from Gemini/OpenAI)
3. **Refine** (optional) — set `LLM_CAMPAIGN_EMAIL_REFINE=1` and `OPENAI_API_KEY` for final JSON cleanup

Disable multi-step: `LLM_WORKFLOW=0` (single provider only, fastest).

## OpenRouter free models

1. Open [OpenRouter models — free](https://openrouter.ai/models?q=free)
2. Copy model ids (often ending in `:free`)
3. Set in Vercel / `.env.local`:

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_SITE_URL=https://crm.vensailabs.in
OPENROUTER_APP_NAME=VenSai CRM

# Try these in order when one hits rate limits:
LLM_OPENROUTER_FREE_MODELS=google/gemini-2.0-flash-exp:free,meta-llama/llama-3.3-70b-instruct:free,qwen/qwen-2.5-72b-instruct:free

# Or a single default:
LLM_OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
```

4. Redeploy Vercel after changing env.

## All recommended env vars

```env
OPENROUTER_API_KEY=
OPENROUTER_SITE_URL=
OPENROUTER_APP_NAME=
GROQ_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

LLM_WORKFLOW=1
LLM_CAMPAIGN_EMAIL_REFINE=0
LLM_OPENROUTER_FREE_MODELS=google/gemini-2.0-flash-exp:free,meta-llama/llama-3.3-70b-instruct:free

# Optional: override provider order for campaign emails
LLM_CHAIN_CAMPAIGN_EMAIL=groq,openrouter,gemini,openai
```

Keys can also live in **Admin → LLM Keys** or **Profile → LLMs** for Groq/OpenAI/Anthropic (OpenRouter/Gemini are env-only today).

## Test

Campaigns → Template → AI prompt → Generate. Check Vercel **Logs** for `[generate-template] LLM workflow: draft:groq/... → polish:gemini`.
