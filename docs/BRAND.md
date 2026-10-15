# VenSai brand in VenSai CRM

Single source of truth for product branding lives in `lib/brand/vensai.ts`. Email templates use `emails/components/VensaiEmailShell.tsx` (header, footer, layout). AI-generated email copy pulls guidelines from `lib/brand/email-ai-guidelines.ts` via `lib/llm/quality-modes.ts`.

## Assets

| Asset | Path |
| ----- | ---- |
| Logo (UI + favicon) | `public/images/vensai-labs-logo.jpg`, `app/icon.jpg` |
| UI component | `components/brand/BrandLogo.tsx` |

## Environment

- **`NEXT_PUBLIC_APP_URL`** — Required in production so transactional and campaign emails resolve an absolute logo URL (`getBrandLogoUrl()`).
- **`NEXT_PUBLIC_BRAND_LOGO_URL`** — Optional override if the app is served from a different host than the public logo CDN.

## Touchpoints

- **App shell:** sidebar (`BrandLogo`), sign-in page, favicon (`app/icon.jpg`).
- **React Email:** campaigns (`CampaignLayout.tsx`), invites, tasks, invoices, scheduled reports, employee welcome.
- **Mailbox AI compose:** brand block in LLM prompts; new-message AI drafts append `getDefaultEmailSignatureHtml()` in `ComposeModal`.

## Colors (reference)

Primary `#0ea5e9`, navy `#0f172a`, canvas `#f4f4f5`. See `VENSAI_BRAND.colors` in code for the full palette.
