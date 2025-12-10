# Layout Architecture Documentation
## Task Group 6.5.1 - Phase 6

**Date**: 2025-11-08
**Spec**: Layout Migration to shadcn dashboard-01
**Purpose**: Comprehensive architecture documentation for the new layout system

---

## Overview

This document describes the architecture of the NextCRM layout system after migration to shadcn/ui dashboard-01 patterns. It serves as a reference for developers maintaining and extending the layout.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        SidebarProvider                          │
│  (State management for sidebar collapse/expand)                │
│                                                                 │
│  ┌──────────────┐  ┌────────────────────────────────────────┐ │
│  │              │  │         SidebarInset                    │ │
│  │  AppSidebar  │  │  (Main content wrapper)                 │ │
│  │              │  │                                         │ │
│  │  ┌────────┐  │  │  ┌──────────────────────────────────┐ │ │
│  │  │ Header │  │  │  │         Header                   │ │ │
│  │  │ (Logo) │  │  │  │  (Search, Theme, User Actions)   │ │ │
│  │  └────────┘  │  │  └──────────────────────────────────┘ │ │
│  │              │  │                                         │ │
│  │  ┌────────┐  │  │  ┌──────────────────────────────────┐ │ │
│  │  │NavMain │  │  │  │      Main Content Area           │ │ │
│  │  │(Modules│  │  │  │      (Page Children)             │ │ │
│  │  │ Menus) │  │  │  │                                  │ │ │
│  │  └────────┘  │  │  │      - Dashboard                 │ │ │
│  │              │  │  │      - CRM Pages                 │ │ │
│  │  ┌────────┐  │  │  │      - Projects Pages            │ │ │
│  │  │ Footer │  │  │  │      - Other Modules             │ │ │
│  │  │(NavUser│  │  │  │                                  │ │ │
│  │  │ Build) │  │  │  └──────────────────────────────────┘ │ │
│  │  └────────┘  │  │                                         │ │
│  │              │  │  ┌──────────────────────────────────┐ │ │
│  └──────────────┘  │  │         Footer                   │ │ │
│                    │  │  (Copyright, Links)              │ │ │
│                    │  └──────────────────────────────────┘ │ │
│                    └────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. SidebarProvider

**Location**: `@/components/ui/sidebar` (shadcn component)

**Purpose**: Manages global sidebar state (collapsed/expanded)

**State**:
- `open`: boolean - Sidebar open state (true = expanded, false = collapsed)
- `setOpen`: function - Updates sidebar state
- `openMobile`: boolean - Mobile sidebar open state
- `setOpenMobile`: function - Updates mobile sidebar state

**Usage**:
```tsx
import { SidebarProvider } from "@/components/ui/sidebar"

export default function RootLayout({ children }) {
  return (
    <SidebarProvider>
      {/* Layout content */}
    </SidebarProvider>
  )
}
```

**Storage**: Sidebar state persists in `localStorage` under key `sidebar:state`

---

### 2. AppSidebar

**Location**: `/app/[locale]/(routes)/components/app-sidebar.tsx`

**Purpose**: Main sidebar component containing navigation, branding, and user section

**Props**:
```typescript
interface AppSidebarProps {
  modules: Module[]    // Enabled modules from database
  dict: Dictionary     // Localization dictionary
  build: number        // Build number for version display
  session: Session     // User session data
}
```

**Structure**:
- **SidebarHeader**: Logo, "N" symbol, app name
- **SidebarContent**: Navigation (NavMain component)
- **SidebarFooter**: User profile (NavUser) and build version

**Features**:
- Responsive (collapses on mobile, collapsible on desktop)
- Module filtering (shows only enabled modules)
- Role-based visibility (admin menu conditional)
- Animation (smooth collapse/expand transitions)

---

### 3. NavMain

**Location**: `/app/[locale]/(routes)/components/nav-main.tsx`

**Purpose**: Renders primary navigation menu with module items

**Props**:
```typescript
interface NavMainProps {
  items: NavItem[]     // Navigation items array
  dict?: Dictionary    // Localization dictionary (optional)
}

interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  items?: NavItem[]    // Sub-items for collapsible groups
}
```

**Features**:
- Simple items (Dashboard, Projects)
- Collapsible groups (CRM, Administration)
- Active state detection (highlights current route)
- Icon support (Lucide React icons)
- Keyboard accessible

---

### 4. NavUser

**Location**: `/app/[locale]/(routes)/components/nav-user.tsx`

**Purpose**: User profile section in sidebar footer with dropdown menu

**Props**:
```typescript
interface NavUserProps {
  user: {
    name: string
    email: string
    avatar?: string
  }
  dict: Dictionary
}
```

**Features**:
- User avatar display
- Dropdown menu (Profile, Settings, Logout)
- Responsive (adapts to sidebar state)
- Accessible (keyboard navigation, ARIA attributes)

---

### 5. Header

**Location**: `/app/[locale]/(routes)/components/Header.tsx`

**Purpose**: Page header with search, utilities, and actions

**Components**:
- **SidebarTrigger**: Mobile hamburger menu (shadcn component)
- **FulltextSearch**: Global search input
- **CommandComponent**: Command palette trigger
- **SetLanguage**: Language selector dropdown
- **ThemeToggle**: Light/dark mode switcher
- **Feedback**: User feedback button
- **SupportComponent**: Support/help resources

**Layout**:
- Left side: SidebarTrigger (mobile), FulltextSearch
- Right side: Utility buttons, ThemeToggle

---

### 6. Module Menu Items

**Location**: `/app/[locale]/(routes)/components/menu-items/`

**Files**:
- `Dashboard.tsx` - Dashboard menu item
- `Crm.tsx` - CRM module with sub-items
- `Projects.tsx` - Projects module (simple item)
- `Emails.tsx` - Emails module
- `SecondBrain.tsx` - SecondBrain/Notion integration
- `Employees.tsx` - Employees module
- `Invoices.tsx` - Invoice module
- `Reports.tsx` - Reports module
- `Documents.tsx` - Documents module
- `Databoxes.tsx` - Databox module
- `ChatGPT.tsx` - OpenAI/ChatGPT module
- `Administration.tsx` - Admin menu (role-restricted)

**Pattern**:
Each menu item exports a function that returns a `NavItem` object:

```typescript
// Simple item example (Projects)
export function getProjectsMenuItem(title: string): NavItem {
  return {
    title,
    url: "/projects",
    icon: ServerIcon,
  }
}

// Collapsible group example (CRM)
export function getCrmMenuGroup(dict: Dictionary): NavItem {
  return {
    title: dict.crm,
    icon: CoinsIcon,
    items: [
      { title: dict.dashboard, url: "/crm/dashboard" },
      { title: dict.accounts, url: "/crm/accounts" },
      { title: dict.contacts, url: "/crm/contacts" },
      // ... more items
    ],
  }
}
```

---

## Module Filtering Logic

### How Module Filtering Works

**Database Source**: `system_Modules_Enabled` table (or similar)

**Fetch Function**: `getModules()` from actions

**Filtering in AppSidebar**:
```typescript
// Example filtering logic
const navItems: NavItem[] = []

// Dashboard (always enabled)
navItems.push(getDashboardMenuItem(dict.Dashboard.dashboard))

// CRM (conditional on module enabled)
if (modules.find(m => m.name === "crm" && m.enabled)) {
  navItems.push(getCrmMenuGroup(dict.ModuleMenu))
}

// Projects (conditional)
if (modules.find(m => m.name === "projects" && m.enabled)) {
  navItems.push(getProjectsMenuItem(dict.ModuleMenu.projects))
}

// ... repeat for other modules
```

**Module Structure**:
```typescript
interface Module {
  id: string
  name: string          // e.g., "crm", "projects"
  enabled: boolean      // true/false
  position: number      // Sort order
  // ... other fields
}
```

**Ordering**: Modules are sorted by `position` field (ascending)

---

## Role-Based Access Control

### Admin-Only Navigation

**Check**: `session.user.is_admin === true`

**Example** (Administration menu):
```typescript
// In app-sidebar.tsx
if (session?.user?.is_admin) {
  navItems.push(getAdministrationMenuGroup(dict.ModuleMenu))
}
```

**Admin Menu Items**:
- Users management
- Modules configuration
- Settings
- System logs (if applicable)

---

### Account Admin Role

**Check**: `session.user.is_account_admin === true`

**Features**:
- Limited admin privileges
- Account management only
- No full system admin access

**Usage**: Similar to admin check, but for account-specific features

---

## Navigation System

### Active State Detection

**Pattern**: Uses `usePathname()` hook (Next.js App Router)

**Implementation** (NavMain):
```typescript
'use client'

import { usePathname } from 'next/navigation'

export function NavMain({ items }: NavMainProps) {
  const pathname = usePathname()

  return items.map(item => {
    const isActive = pathname.startsWith(item.url)
    // ... render with active state
  })
}
```

**Active States**:
- Parent group active if any child is active
- Child item active if pathname matches
- Visual indicator: Bold text, different background color

---

### Collapsible Groups

**Pattern**: Uses shadcn Collapsible component

**Implementation**:
```typescript
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

<Collapsible defaultOpen={isActive}>
  <CollapsibleTrigger>
    {item.title}
  </CollapsibleTrigger>
  <CollapsibleContent>
    {item.items.map(subItem => (
      <Link href={subItem.url}>{subItem.title}</Link>
    ))}
  </CollapsibleContent>
</Collapsible>
```

**Behavior**:
- Groups auto-expand if child route is active
- Groups can be manually toggled by user
- Smooth animation (shadcn default)

---

## Responsive Behavior

### Breakpoints

**Mobile**: < 768px
- Sidebar hidden by default
- Hamburger menu trigger visible
- Sidebar opens as overlay/sheet
- Backdrop closes sidebar

**Tablet**: 768px - 1024px
- Sidebar visible by default
- Collapsible to icon-only mode
- Rail toggle visible

**Desktop**: ≥ 1024px
- Sidebar expanded by default
- Full navigation visible
- Collapsible to icon-only mode

---

### Mobile Sidebar (Sheet Behavior)

**Implementation**: shadcn Sidebar uses Sheet component internally

**Features**:
- Opens as overlay (z-index above content)
- Backdrop/overlay closes sidebar
- Swipe gestures (if enabled)
- Auto-closes after navigation

---

### Desktop Sidebar (Collapsible)

**Implementation**: CSS-based collapse/expand

**States**:
- **Expanded**: Full width (e.g., 240px), shows text + icons
- **Collapsed**: Icon width (e.g., 60px), shows icons only

**Toggle**: Click sidebar rail (thin bar on right edge)

---

## Internationalization

### Localization System

**Library**: `next-intl`

**Dictionary Structure**:
```typescript
interface Dictionary {
  ModuleMenu: {
    dashboard: string
    projects: string
    crm: string
    // ... more keys
  }
  Dashboard: {
    dashboard: string
  }
  // ... more namespaces
}
```

**Usage**:
```typescript
// In server component
import { getDictionary } from '@/i18n/get-dictionary'

export default async function Layout({ params }) {
  const dict = await getDictionary(params.locale)

  return <AppSidebar dict={dict.ModuleMenu} />
}
```

**Supported Locales**: (e.g., en, cs, de, es, fr, etc.)

---

## Theme System

### Theme Toggle

**Library**: `next-themes`

**Implementation**: ThemeToggle component in Header

**Themes**:
- Light mode
- Dark mode
- System preference (auto)

**Persistence**: Stored in `localStorage` under key `theme`

**Application**: CSS classes on `<html>` element
- Light: No class or `class="light"`
- Dark: `class="dark"`

**CSS Variables**:
All theme colors use CSS custom properties:
```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  /* ... more variables */
}

.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  /* ... more variables */
}
```

---

## Data Flow

### Server-Side Data Fetching

**Layout Component** (`/app/[locale]/(routes)/layout.tsx`):
1. Fetch session (NextAuth)
2. Check user status (ACTIVE, PENDING, INACTIVE)
3. Redirect if necessary
4. Fetch modules (enabled modules from database)
5. Fetch dictionary (localization)
6. Fetch build number
7. Pass data to AppSidebar

**Example**:
```typescript
export default async function Layout({ children, params }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/sign-in')
  }

  if (session.user.status === 'PENDING') {
    redirect('/pending')
  }

  const modules = await getModules()
  const dict = await getDictionary(params.locale)
  const build = process.env.NEXT_PUBLIC_BUILD_NUMBER || 0

  return (
    <SidebarProvider>
      <AppSidebar modules={modules} dict={dict} build={build} session={session} />
      <SidebarInset>
        <Header />
        {children}
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}
```

---

### Client-Side State Management

**Sidebar State**: Managed by `SidebarProvider` context

**Active Route**: Detected via `usePathname()` hook

**Theme**: Managed by `next-themes` context

**No Global State Library**: Uses React Context and Server Components

---

## Performance Considerations

### Optimizations Applied

1. **Server Components**: Layout, AppSidebar, NavMain (where possible)
2. **Client Components**: Only interactive components (NavUser dropdown, theme toggle)
3. **Code Splitting**: Lazy loading of heavy components
4. **CSS Animations**: Use CSS transitions (not JavaScript)
5. **Image Optimization**: Next.js Image component for avatars
6. **Font Loading**: Optimized font loading (font-display: swap)

---

### Layout Stability

**No CLS (Cumulative Layout Shift)**:
- Sidebar dimensions fixed
- Logo dimensions fixed
- Navigation items have consistent height
- Fonts load with fallback

---

## File Structure

```
/app/[locale]/(routes)/
├── layout.tsx                    # Main layout (SidebarProvider, AppSidebar, Header)
├── page.tsx                      # Dashboard page
├── components/
│   ├── app-sidebar.tsx          # Main sidebar component
│   ├── nav-main.tsx             # Primary navigation
│   ├── nav-user.tsx             # User profile section
│   ├── nav-secondary.tsx        # Secondary navigation (if needed)
│   ├── Header.tsx               # Page header
│   ├── Footer.tsx               # Page footer
│   └── menu-items/              # Module menu definitions
│       ├── Dashboard.tsx
│       ├── Crm.tsx
│       ├── Projects.tsx
│       ├── Administration.tsx
│       └── ... (other modules)
└── [modules]/                    # Module-specific pages
    ├── crm/
    ├── projects/
    ├── invoices/
    └── ... (other modules)

/components/ui/                   # shadcn components
├── sidebar.tsx                  # Sidebar component (shadcn)
├── collapsible.tsx              # Collapsible component
├── dropdown-menu.tsx            # Dropdown component
├── button.tsx                   # Button component
└── ... (other shadcn components)
```

---

## Dependencies

### Key Libraries

- `next`: 15.x (App Router, Server Components)
- `react`: 19.x
- `@radix-ui/react-*`: UI primitives (via shadcn)
- `lucide-react`: Icons
- `next-auth`: Authentication
- `next-intl`: Internationalization
- `next-themes`: Theme management
- `tailwindcss`: Styling
- `class-variance-authority`: Component variants
- `clsx` / `tailwind-merge`: Utility classes

---

## Testing Strategy

### Unit Tests

- Component rendering
- Props validation
- Active state logic
- Module filtering logic

### Integration Tests

- Sidebar interaction
- Navigation flow
- Theme switching
- User dropdown

### E2E Tests

See `/testing/TEST_COVERAGE_REVIEW.md` for comprehensive test suite (138 tests)

---

## Known Limitations

### Current Limitations

1. **Team Switcher**: Not implemented (future enhancement)
2. **Navigation Search**: Not implemented in sidebar (future feature)
3. **Breadcrumbs**: Not implemented in header (future feature)
4. **Module Drag-and-Drop**: Module order set via database `position` field only
5. **User Preferences**: Sidebar state persists in localStorage only (not in database)

### Browser Support

- **Chrome**: ✅ Full support (latest)
- **Firefox**: ✅ Full support (latest)
- **Safari**: ✅ Full support (latest)
- **Edge**: ✅ Full support (Chromium-based)
- **IE11**: ❌ Not supported

---

## Future Enhancements

### Potential Improvements

1. **Team/Organization Switcher**: Multi-tenant support
2. **Navigation Search**: Filter navigation items
3. **Breadcrumbs**: Show current location
4. **Keyboard Shortcuts**: Global shortcuts for navigation
5. **User Preferences**: Save sidebar state to database
6. **Module Reordering**: Drag-and-drop module order in admin panel
7. **Custom Themes**: User-defined color schemes
8. **Navigation Favorites**: Pin frequently used items
9. **Recent Pages**: Quick access to recent pages
10. **Notifications**: Notification center in header

---

## Support & Maintenance

### For Questions

- **Architecture**: Refer to this document
- **Implementation**: See `/documentation/developer-guide.md`
- **Testing**: See `/testing/` directory
- **Issues**: See `/documentation/known-issues.md`

---

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**Author**: Claude Code (Phase 6 Implementation)
**Task Group**: 6.5.1 - Documentation & Handoff
