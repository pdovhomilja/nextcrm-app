# Profile Settings Page Redesign

**Date:** 2026-03-21
**Status:** Approved
**Scope:** Refactor `/profile` page into a professional settings layout with sidebar navigation

---

## Overview

The current profile page is a single vertical stack of 6 unsorted sections with no visual hierarchy. This redesign replaces it with a professional settings layout using a left sidebar, hero banner, and URL-based tab navigation.

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Navigation type | Left sidebar | GitHub/Vercel/Stripe pattern — professional, scales well |
| Tab count | 4 tabs | One clear responsibility per tab; avoids thin 1-section tabs |
| Header | Gradient hero banner | Personalized feel; shows avatar, name, email, role |
| Tab routing | URL search params (`?tab=profile`) | Bookmarkable, browser-back works |
| Content structure | Card-based sections within each tab | Visual separation without page reloads |

---

## Tab Structure

### Profile (`?tab=profile`)
- **Profile Photo card** — avatar preview, upload button, remove button
- **Personal Information card** — first name, last name, email, username

### Security (`?tab=security`)
- **Change Password card** — current password, new password, confirm new password

### Preferences (`?tab=preferences`)
- **Language card** — language selector (current: `LanguageForm`)

### Developer (`?tab=developer`)
- **OpenAI Integration card** — OpenAI API key input (`OpenAiForm`)
- **API Tokens card** — MCP API token management (`ApiTokens`)

---

## Layout Structure

```
┌─────────────────────────────────────────────────┐
│  Page Header: "Profile Settings"                │
│  Description: "Manage your account..."         │
├─────────────────────────────────────────────────┤
│  Hero Banner (gradient: blue → violet)         │
│  [Avatar initials]  Name  Email  Role badge     │
├──────────────┬──────────────────────────────────┤
│  Sidebar     │  Content Area                    │
│              │                                  │
│  Account     │  ┌──────────────────────────┐   │
│  · Profile   │  │  Card title              │   │
│              │  │  Form fields...          │   │
│  Security    │  └──────────────────────────┘   │
│  · Security  │                                  │
│              │  ┌──────────────────────────┐   │
│  App         │  │  Card title              │   │
│  · Preferences│  │  Form fields...          │   │
│              │  └──────────────────────────┘   │
│  Developer   │                                  │
│  · Developer │                [Save changes]    │
└──────────────┴──────────────────────────────────┘
```

---

## Component Architecture

### New components to create

| Component | Path | Purpose |
|---|---|---|
| `ProfileTabs` | `profile/components/ProfileTabs.tsx` | Client component — reads `?tab` search param, renders sidebar nav + active tab content |
| `ProfileHero` | `profile/components/ProfileHero.tsx` | Hero banner with user avatar, name, email, role |
| `ProfileTabContent` | `profile/components/tabs/ProfileTabContent.tsx` | Profile photo + personal info cards |
| `SecurityTabContent` | `profile/components/tabs/SecurityTabContent.tsx` | Password change card |
| `PreferencesTabContent` | `profile/components/tabs/PreferencesTabContent.tsx` | Language card |
| `DeveloperTabContent` | `profile/components/tabs/DeveloperTabContent.tsx` | OpenAI + API tokens cards |

### Existing components to reuse (no changes)

- `ProfileForm` (`ProfileForm.tsx`) — personal info form
- `ProfilePhotoForm` (`ProfilePhotoForm.tsx`) — photo upload
- `PasswordChangeForm` (`PasswordChange.tsx`, exported as `PasswordChangeForm`) — password change
- `LanguageForm` (`LanguageForm.tsx`) — language selector
- `OpenAiForm` (`OpenAiForm.tsx`) — OpenAI key
- `ApiTokens` (`ApiTokens.tsx`) — MCP tokens

### Page changes

`profile/page.tsx` — simplified to: fetch user, render `ProfileHero` + `ProfileTabs`, pass user data down.

---

## Routing

Tab state is managed via URL search params. Default tab is `profile`.

```
/profile              → Profile tab (default)
/profile?tab=profile  → Profile tab
/profile?tab=security → Security tab
/profile?tab=preferences → Preferences tab
/profile?tab=developer   → Developer tab
```

`ProfileTabs` is a Client Component that:
1. Reads `?tab` via `useSearchParams()`
2. Updates URL via `router.push()` on nav item click — App Router handles same-route navigation without a full reload; no `shallow` flag needed (that was a Pages Router concept)
3. Renders the matching tab content component

**Important:** `useSearchParams()` requires a `<Suspense>` boundary. `page.tsx` must wrap `ProfileTabs` in `<Suspense fallback={...}>`, otherwise the build will fail in production.

---

## Sidebar Nav

Flat single-level navigation with 4 items. No groups — each tab has a distinct enough name to stand alone.

```
Profile
Security
Preferences
Developer
```

Items are links (`router.push`). Active item is highlighted. Icons accompany each label for scannability.

---

## Hero Banner

- Background: CSS gradient (`from-blue-500 to-violet-600`)
- Avatar: Shows user initials (first + last name) if no photo; shows photo if uploaded
- Fields shown: full name, email address, role badge (from session)
- No actions in the banner itself — editing happens in the Profile tab

---

## Technology

- Uses existing shadcn/ui components: `Card`, `Tabs` (or custom sidebar), `Button`, `Input`, `Label`
- `useSearchParams` + `useRouter` for URL tab state (Client Component)
- All existing server actions remain unchanged
- i18n: extend existing `ProfilePage` translation namespace with new keys:
  - Tab labels: `tabs.profile`, `tabs.security`, `tabs.preferences`, `tabs.developer`
  - Tab descriptions: `tabs.profileDesc`, `tabs.securityDesc`, `tabs.preferencesDesc`, `tabs.developerDesc`
  - Card titles: `cards.photo`, `cards.personalInfo`, `cards.changePassword`, `cards.language`, `cards.openai`, `cards.apiTokens`
- Responsive: on mobile (`< md`), the left sidebar collapses into a horizontal scrollable tab bar at the top of the settings body; hero banner stacks vertically

---

## Out of Scope

- No new settings sections beyond the existing 6
- No profile cover/banner image upload
- No notification preferences (not currently in the app)
- No account deletion flow
