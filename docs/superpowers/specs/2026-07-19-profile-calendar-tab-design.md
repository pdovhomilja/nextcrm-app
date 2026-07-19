# Profile "Calendar" Tab — Design

**Date:** 2026-07-19 · Follow-up to AQUNAMA Phase 4 (`2026-07-19-aqunama-p4-calendar-sync-design.md`)

Calendar connections move out of the Email Accounts tab into their own profile tab (`/profile?tab=calendar`), shown in the profile's left-hand tab nav. Approved by user 2026-07-19.

## Changes

1. **`components/tabs/CalendarTabContent.tsx`** (new) — renders `CalendarConnectionsList`.
2. **`ProfileTabs.tsx`** — `calendar` added to `Tab` type, `TAB_IDS`, `TAB_ICONS` (lucide `CalendarClock`), `tabs` array (`t("tabs.calendar")`/`t("tabs.calendarDesc")`), `contentMap`, new `calendarContent` prop; `page.tsx` passes it. Tab order: after `emails`, before `llms`.
3. **`EmailAccountsTabContent.tsx`** — `CalendarConnectionsList` mount removed.
4. **`CalendarConnectionsList.tsx`** — gains (a) a status banner reading the OAuth callback's `?calendar=` param (`connected` → success; `error` / `state-mismatch` / `no-refresh-token` → specific guidance), fixing the silent-failure gap found while debugging the API-not-enabled issue; (b) try/catch + `res.ok` handling on both fetches with a visible error state (deferred Phase 4 review finding).
5. **Google OAuth callback route** — all `/profile?calendar=...` redirects become `/profile?tab=calendar&calendar=...` so the user lands on the new tab with the banner visible.
6. **Locales** — `ProfilePage.tabs.calendar` + `calendarDesc` added to `en`, `cz`, `de`, `uk`. Banner strings stay hardcoded English, matching the component's existing copy.

No schema, API-shape, or sync-logic changes. Verification: `tsc --noEmit`, existing jest suites, manual re-run of the connect flow (validated working earlier today).
