# Profile Settings Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat vertical profile page with a professional left-sidebar settings layout featuring a hero banner, 4 tab sections, and URL-based tab navigation.

**Architecture:** `page.tsx` becomes a thin Server Component that fetches the user and renders `ProfileHero` + a `<Suspense>`-wrapped `ProfileTabs`. `ProfileTabs` is a Client Component that reads `?tab` from the URL and renders the matching tab content. All 6 existing form components are reused unchanged inside 4 new tab content wrappers.

**Tech Stack:** Next.js 15 App Router, `useSearchParams` + `useRouter` (next/navigation), shadcn/ui (`Card`, `Button`, `Separator`), Tailwind CSS, next-intl, TypeScript.

---

## File Map

### New files to create

| File | Responsibility |
|---|---|
| `app/[locale]/(routes)/profile/components/ProfileHero.tsx` | Hero banner — gradient bg, avatar, name, email, role |
| `app/[locale]/(routes)/profile/components/ProfileTabs.tsx` | Client component — sidebar nav, reads/writes `?tab` param, renders active tab |
| `app/[locale]/(routes)/profile/components/tabs/ProfileTabContent.tsx` | Profile tab — wraps `ProfilePhotoForm` + `ProfileForm` in cards |
| `app/[locale]/(routes)/profile/components/tabs/SecurityTabContent.tsx` | Security tab — wraps `PasswordChangeForm` in a card |
| `app/[locale]/(routes)/profile/components/tabs/PreferencesTabContent.tsx` | Preferences tab — wraps `LanguageForm` in a card |
| `app/[locale]/(routes)/profile/components/tabs/DeveloperTabContent.tsx` | Developer tab — wraps `OpenAiForm` + `ApiTokens` in cards |

### Files to modify

| File | Change |
|---|---|
| `app/[locale]/(routes)/profile/page.tsx` | Replace vertical stack with `ProfileHero` + `<Suspense><ProfileTabs /></Suspense>` |
| `locales/en.json` | Add new i18n keys for tabs, tab descriptions, and card titles |

### Files left unchanged

`ProfileForm.tsx`, `ProfilePhotoForm.tsx`, `PasswordChange.tsx`, `LanguageForm.tsx`, `OpenAiForm.tsx`, `ApiTokens.tsx`, all server actions.

---

## Task 1: Add i18n keys

**Files:**
- Modify: `locales/en.json`

- [ ] **Step 1: Add new keys to the `ProfilePage` section in `locales/en.json`**

Find the `"ProfilePage"` key and add after the existing keys:

```json
"tabs": {
  "profile": "Profile",
  "security": "Security",
  "preferences": "Preferences",
  "developer": "Developer",
  "profileDesc": "Update your photo and personal details",
  "securityDesc": "Manage your password and account security",
  "preferencesDesc": "Customize your language and display settings",
  "developerDesc": "Manage API keys and developer integrations"
},
"cards": {
  "photo": "Profile Photo",
  "personalInfo": "Personal Information",
  "changePassword": "Change Password",
  "language": "Language",
  "openai": "OpenAI Integration",
  "apiTokens": "API Tokens"
},
"hero": {
  "role": "Admin"
}
```

- [ ] **Step 2: Commit**

```bash
git add locales/en.json
git commit -m "feat(profile): add i18n keys for settings redesign"
```

---

## Task 2: ProfileHero component

**Files:**
- Create: `app/[locale]/(routes)/profile/components/ProfileHero.tsx`

- [ ] **Step 1: Create `ProfileHero.tsx`**

```tsx
// app/[locale]/(routes)/profile/components/ProfileHero.tsx
import { User } from "@prisma/client";
import { getTranslations } from "next-intl/server";

type Props = {
  data: User;
};

export async function ProfileHero({ data }: Props) {
  const t = await getTranslations("ProfilePage");

  const initials = [data.name]
    .filter(Boolean)
    .join(" ")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bg-gradient-to-r from-blue-500 to-violet-600 px-7 py-6 flex items-center gap-4">
      <div className="h-16 w-16 rounded-full bg-white/25 border-2 border-white/50 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 overflow-hidden">
        {data.image ? (
          <img
            src={data.image}
            alt={data.name ?? ""}
            className="h-full w-full object-cover"
          />
        ) : (
          initials || "?"
        )}
      </div>
      <div>
        <div className="text-white text-lg font-bold leading-tight">
          {data.name}
        </div>
        <div className="text-white/75 text-sm">{data.email}</div>
        <span className="mt-1.5 inline-block rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
          {t("hero.role")}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/\(routes\)/profile/components/ProfileHero.tsx
git commit -m "feat(profile): add ProfileHero banner component"
```

---

## Task 3: Tab content components

**Files:**
- Create: `app/[locale]/(routes)/profile/components/tabs/ProfileTabContent.tsx`
- Create: `app/[locale]/(routes)/profile/components/tabs/SecurityTabContent.tsx`
- Create: `app/[locale]/(routes)/profile/components/tabs/PreferencesTabContent.tsx`
- Create: `app/[locale]/(routes)/profile/components/tabs/DeveloperTabContent.tsx`

- [ ] **Step 1: Create `ProfileTabContent.tsx`**

```tsx
// app/[locale]/(routes)/profile/components/tabs/ProfileTabContent.tsx
import { User } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { ProfilePhotoForm } from "../ProfilePhotoForm";
import { ProfileForm } from "../ProfileForm";

type Props = { data: User };

export async function ProfileTabContent({ data }: Props) {
  const t = await getTranslations("ProfilePage");
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-card-foreground">
          {t("cards.photo")}
        </h3>
        <ProfilePhotoForm data={data} />
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-card-foreground">
          {t("cards.personalInfo")}
        </h3>
        <ProfileForm data={data} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `SecurityTabContent.tsx`**

```tsx
// app/[locale]/(routes)/profile/components/tabs/SecurityTabContent.tsx
import { getTranslations } from "next-intl/server";
import { PasswordChangeForm } from "../PasswordChange";

type Props = { userId: string };

export async function SecurityTabContent({ userId }: Props) {
  const t = await getTranslations("ProfilePage");
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-card-foreground">
        {t("cards.changePassword")}
      </h3>
      <PasswordChangeForm userId={userId} />
    </div>
  );
}
```

- [ ] **Step 3: Create `PreferencesTabContent.tsx`**

```tsx
// app/[locale]/(routes)/profile/components/tabs/PreferencesTabContent.tsx
import { getTranslations } from "next-intl/server";
import { LanguageForm } from "../LanguageForm";

type Props = { userId: string };

export async function PreferencesTabContent({ userId }: Props) {
  const t = await getTranslations("ProfilePage");
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-card-foreground">
        {t("cards.language")}
      </h3>
      <LanguageForm userId={userId} />
    </div>
  );
}
```

- [ ] **Step 4: Create `DeveloperTabContent.tsx`**

```tsx
// app/[locale]/(routes)/profile/components/tabs/DeveloperTabContent.tsx
import { getTranslations } from "next-intl/server";
import { OpenAiForm } from "../OpenAiForm";
import { ApiTokens } from "../ApiTokens";

type Props = { userId: string };

export async function DeveloperTabContent({ userId }: Props) {
  const t = await getTranslations("ProfilePage");
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-card-foreground">
          {t("cards.openai")}
        </h3>
        <OpenAiForm userId={userId} />
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-card-foreground">
          {t("cards.apiTokens")}
        </h3>
        <ApiTokens />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/\(routes\)/profile/components/tabs/
git commit -m "feat(profile): add tab content components"
```

---

## Task 4: ProfileTabs client component

**Files:**
- Create: `app/[locale]/(routes)/profile/components/ProfileTabs.tsx`

This is the only Client Component in the new layout. It owns URL-based tab state.

- [ ] **Step 1: Create `ProfileTabs.tsx`**

```tsx
// app/[locale]/(routes)/profile/components/ProfileTabs.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { User } from "@prisma/client";
import { cn } from "@/lib/utils";
import { UserCircle, Lock, Globe, Code2 } from "lucide-react";

// Do NOT import tab content components here — they are Server Components
// and must be passed as ReactNode props from page.tsx

type Tab = "profile" | "security" | "preferences" | "developer";

const TAB_ICONS: Record<Tab, React.ElementType> = {
  profile: UserCircle,
  security: Lock,
  preferences: Globe,
  developer: Code2,
};

type Props = {
  data: User;
  profileContent: React.ReactNode;
  securityContent: React.ReactNode;
  preferencesContent: React.ReactNode;
  developerContent: React.ReactNode;
};

export function ProfileTabs({
  data,
  profileContent,
  securityContent,
  preferencesContent,
  developerContent,
}: Props) {
  const t = useTranslations("ProfilePage");
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = (searchParams.get("tab") as Tab) ?? "profile";

  const tabs: { id: Tab; label: string; desc: string }[] = [
    { id: "profile", label: t("tabs.profile"), desc: t("tabs.profileDesc") },
    { id: "security", label: t("tabs.security"), desc: t("tabs.securityDesc") },
    { id: "preferences", label: t("tabs.preferences"), desc: t("tabs.preferencesDesc") },
    { id: "developer", label: t("tabs.developer"), desc: t("tabs.developerDesc") },
  ];

  const activeTabMeta = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  const contentMap: Record<Tab, React.ReactNode> = {
    profile: profileContent,
    security: securityContent,
    preferences: preferencesContent,
    developer: developerContent,
  };

  return (
    <div className="flex min-h-[480px]">
      {/* Sidebar nav — hidden on mobile, shown md+ */}
      <nav className="hidden md:flex w-48 flex-col flex-shrink-0 border-r border-border p-3 gap-1">
        {tabs.map(({ id, label }) => {
          const Icon = TAB_ICONS[id];
          return (
            <button
              key={id}
              onClick={() => router.push(`?tab=${id}`)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-left transition-colors",
                activeTab === id
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <div className="flex-1 p-6 overflow-hidden">
        {/* Mobile horizontal scroll tabs */}
        <div className="flex md:hidden gap-1 mb-5 overflow-x-auto pb-1 border-b border-border">
          {tabs.map(({ id, label }) => {
            const Icon = TAB_ICONS[id];
            return (
              <button
                key={id}
                onClick={() => router.push(`?tab=${id}`)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs whitespace-nowrap transition-colors",
                  activeTab === id
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab heading */}
        <div className="mb-5 pb-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            {activeTabMeta.label}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeTabMeta.desc}
          </p>
        </div>

        {contentMap[activeTab]}
      </div>
    </div>
  );
}
```

**Note:** Tab content components (`ProfileTabContent` etc.) are Server Components. They are rendered in `page.tsx` and passed as `ReactNode` props into `ProfileTabs`. This avoids making the client component fetch data — the server renders all tab content upfront.

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/\(routes\)/profile/components/ProfileTabs.tsx
git commit -m "feat(profile): add ProfileTabs client component with URL routing"
```

---

## Task 5: Update page.tsx

**Files:**
- Modify: `app/[locale]/(routes)/profile/page.tsx`

- [ ] **Step 1: Replace `page.tsx` content**

```tsx
// app/[locale]/(routes)/profile/page.tsx
import { Suspense } from "react";
import { getUser } from "@/actions/get-user";
import { getTranslations } from "next-intl/server";

import Container from "../components/ui/Container";
import { ProfileHero } from "./components/ProfileHero";
import { ProfileTabs } from "./components/ProfileTabs";
import { ProfileTabContent } from "./components/tabs/ProfileTabContent";
import { SecurityTabContent } from "./components/tabs/SecurityTabContent";
import { PreferencesTabContent } from "./components/tabs/PreferencesTabContent";
import { DeveloperTabContent } from "./components/tabs/DeveloperTabContent";

const ProfilePage = async () => {
  const t = await getTranslations("ProfilePage");
  const data = await getUser();

  if (!data) {
    return <div>No user data.</div>;
  }

  return (
    <Container title={t("title")} description={t("description")}>
      <div className="rounded-lg border border-border overflow-hidden">
        <ProfileHero data={data} />
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
          <ProfileTabs
            data={data}
            profileContent={<ProfileTabContent data={data} />}
            securityContent={<SecurityTabContent userId={data.id} />}
            preferencesContent={<PreferencesTabContent userId={data.id} />}
            developerContent={<DeveloperTabContent userId={data.id} />}
          />
        </Suspense>
      </div>
    </Container>
  );
};

export default ProfilePage;
```

- [ ] **Step 2: Start dev server and verify the page loads**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
pnpm dev
```

Open `http://localhost:3000/en/profile` and verify:
- Hero banner shows with gradient, avatar initials, name, email
- Sidebar shows 4 nav items on desktop
- Profile tab content (photo + personal info cards) is visible by default
- Clicking a nav item updates the URL and swaps the content
- Mobile: horizontal tab bar replaces the sidebar

- [ ] **Step 3: Check for TypeScript errors**

```bash
pnpm tsc --noEmit
```

Expected: no errors in profile-related files.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/\(routes\)/profile/page.tsx
git commit -m "feat(profile): wire up new settings layout in page.tsx"
```

---

## Task 6: Final QA checklist

- [ ] Navigate to `/en/profile` — hero banner renders with correct user data
- [ ] Click each of the 4 nav items — URL updates, content swaps without full reload
- [ ] Directly visit `/en/profile?tab=developer` — Developer tab is active on load
- [ ] Resize to mobile width — horizontal tab bar appears, sidebar is hidden
- [ ] Submit a form in each tab — toast feedback still works (no regressions)
- [ ] Verify `pnpm build` completes without errors

```bash
pnpm build 2>&1 | tail -20
```

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat(profile): complete profile settings page redesign"
```
