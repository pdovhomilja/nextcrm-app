# Developer Guide
## Task Group 6.5.2 - Phase 6

**Date**: 2025-11-08
**Spec**: Layout Migration to shadcn dashboard-01
**Audience**: Developers maintaining and extending the layout

---

## Quick Start

### Adding a New Navigation Item

#### Simple Navigation Item (Like Projects)

1. **Create menu item file**: `/app/[locale]/(routes)/components/menu-items/YourModule.tsx`

```typescript
import { YourIcon } from 'lucide-react'
import { NavItem } from '@/types/nav' // Define if not exists

export function getYourModuleMenuItem(title: string): NavItem {
  return {
    title,
    url: "/your-module",
    icon: YourIcon,
  }
}
```

2. **Add to AppSidebar**: `/app/[locale]/(routes)/components/app-sidebar.tsx`

```typescript
import { getYourModuleMenuItem } from './menu-items/YourModule'

// Inside component, add to navItems array
if (modules.find(m => m.name === "your-module" && m.enabled)) {
  navItems.push(getYourModuleMenuItem(dict.ModuleMenu.yourModule))
}
```

3. **Add localization**: `/locales/en.json`

```json
{
  "ModuleMenu": {
    "yourModule": "Your Module"
  }
}
```

4. **Enable module in database**: Add entry to `system_Modules_Enabled` table

```sql
INSERT INTO system_Modules_Enabled (name, enabled, position)
VALUES ('your-module', true, 10);
```

**Done!** Your module now appears in the navigation.

---

#### Collapsible Group (Like CRM)

1. **Create menu item file**: `/app/[locale]/(routes)/components/menu-items/YourModuleGroup.tsx`

```typescript
import { YourIcon } from 'lucide-react'
import { NavItem } from '@/types/nav'

export function getYourModuleGroup(dict: any): NavItem {
  return {
    title: dict.yourModule,
    icon: YourIcon,
    items: [
      { title: dict.subItem1, url: "/your-module/sub1" },
      { title: dict.subItem2, url: "/your-module/sub2" },
      { title: dict.subItem3, url: "/your-module/sub3" },
    ],
  }
}
```

2. **Add to AppSidebar**: Same as simple item, but use `getYourModuleGroup(dict.ModuleMenu)`

3. **Add localizations**: Add all sub-item titles to locale files

**Done!** Your module group appears with expandable sub-items.

---

### Adding a New Module

Complete steps to add a fully functional module:

#### 1. Database Setup

```sql
-- Add module to system_Modules_Enabled table
INSERT INTO system_Modules_Enabled (id, name, enabled, position, created_at, updated_at)
VALUES (
  'unique-id',
  'your-module',
  true,
  10, -- Sort order (10, 20, 30, etc.)
  NOW(),
  NOW()
);
```

#### 2. Create Module Pages

```bash
mkdir -p /app/[locale]/(routes)/your-module
touch /app/[locale]/(routes)/your-module/page.tsx
```

```typescript
// /app/[locale]/(routes)/your-module/page.tsx
export default function YourModulePage() {
  return (
    <div>
      <h1>Your Module</h1>
      {/* Your module content */}
    </div>
  )
}
```

#### 3. Create Navigation Item

Follow steps from "Adding a New Navigation Item" above.

#### 4. Add Permissions (Optional)

If module requires admin access:

```typescript
// In app-sidebar.tsx
if (modules.find(m => m.name === "your-module" && m.enabled) &&
    session?.user?.is_admin) {
  navItems.push(getYourModuleMenuItem(dict.ModuleMenu.yourModule))
}
```

#### 5. Test

1. Restart dev server: `pnpm dev`
2. Login as user
3. Navigate to module: `/your-module`
4. Verify navigation item appears

---

### Customizing the Sidebar

#### Change Sidebar Width

```typescript
// /components/ui/sidebar.tsx
// Modify CSS classes on Sidebar component

// Expanded width
<Sidebar className="w-64"> // Default 240px, change to 256px

// Collapsed width
<Sidebar className="w-16"> // Default 64px, change to 80px
```

#### Change Sidebar Colors

```css
/* /app/[locale]/globals.css */

/* Light mode sidebar */
:root {
  --sidebar-background: 0 0% 98%; /* Change background */
  --sidebar-foreground: 240 10% 3.9%; /* Change text color */
}

/* Dark mode sidebar */
.dark {
  --sidebar-background: 240 10% 3.9%; /* Change background */
  --sidebar-foreground: 0 0% 98%; /* Change text color */
}
```

#### Change Logo/Branding

```typescript
// /app/[locale]/(routes)/components/app-sidebar.tsx

// Change "N" symbol
<div className="...">N</div> // Replace with <Image> or other element

// Change app name
<span className="...">{process.env.NEXT_PUBLIC_APP_NAME}</span>
// Or hardcode: <span>My App</span>
```

#### Add New Sidebar Section

```typescript
// /app/[locale]/(routes)/components/app-sidebar.tsx

<SidebarContent>
  <NavMain items={navItems} dict={dict} />

  {/* Add new section */}
  <SidebarGroup>
    <SidebarGroupLabel>Utilities</SidebarGroupLabel>
    <SidebarMenu>
      <SidebarMenuItem>
        <Link href="/settings">Settings</Link>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>
</SidebarContent>
```

---

### Common Patterns

#### Conditional Menu Items

```typescript
// Show only to admins
if (session?.user?.is_admin) {
  navItems.push(adminItem)
}

// Show only if feature flag enabled
if (process.env.NEXT_PUBLIC_FEATURE_X === 'true') {
  navItems.push(featureXItem)
}

// Show only if user has permission
if (session?.user?.permissions.includes('manage_reports')) {
  navItems.push(reportsItem)
}
```

#### Badge/Counter on Menu Item

```typescript
// In menu item definition
export function getMessagesMenuItem(title: string, unreadCount: number): NavItem {
  return {
    title,
    url: "/messages",
    icon: MailIcon,
    badge: unreadCount > 0 ? String(unreadCount) : undefined,
  }
}

// In NavMain component, render badge
{item.badge && (
  <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
    {item.badge}
  </span>
)}
```

#### External Links

```typescript
// Menu item with external link
export function getDocsMenuItem(title: string): NavItem {
  return {
    title,
    url: "https://docs.example.com",
    icon: BookIcon,
    external: true, // Custom flag
  }
}

// In NavMain, check for external
{item.external ? (
  <a href={item.url} target="_blank" rel="noopener noreferrer">
    {item.title}
  </a>
) : (
  <Link href={item.url}>{item.title}</Link>
)}
```

#### Nested Sub-Items (3+ levels)

```typescript
// Not recommended for UX, but possible
export function getComplexGroup(dict: any): NavItem {
  return {
    title: dict.parent,
    icon: ParentIcon,
    items: [
      {
        title: dict.child1,
        url: "/parent/child1",
      },
      {
        title: dict.child2,
        icon: ChildIcon,
        items: [ // Nested sub-items
          { title: dict.grandchild1, url: "/parent/child2/gc1" },
          { title: dict.grandchild2, url: "/parent/child2/gc2" },
        ],
      },
    ],
  }
}

// In NavMain, handle recursively with nested Collapsible
```

---

## Component Usage Examples

### Using Sidebar Components

#### SidebarMenu

```typescript
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

<SidebarMenu>
  <SidebarMenuItem>
    <SidebarMenuButton asChild>
      <Link href="/dashboard">
        <LayoutDashboard />
        <span>Dashboard</span>
      </Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
</SidebarMenu>
```

#### Collapsible Group

```typescript
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronRight } from "lucide-react"

<Collapsible defaultOpen={isActive}>
  <SidebarMenuItem>
    <CollapsibleTrigger asChild>
      <SidebarMenuButton>
        <CrmIcon />
        <span>CRM</span>
        <ChevronRight className="ml-auto" />
      </SidebarMenuButton>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <SidebarMenuSub>
        {subItems.map(item => (
          <SidebarMenuSubItem key={item.url}>
            <SidebarMenuSubButton asChild>
              <Link href={item.url}>{item.title}</Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        ))}
      </SidebarMenuSub>
    </CollapsibleContent>
  </SidebarMenuItem>
</Collapsible>
```

#### Dropdown Menu (NavUser)

```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <SidebarMenuButton>
      <Avatar />
      <span>{user.name}</span>
    </SidebarMenuButton>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <Link href="/profile">Profile</Link>
    </DropdownMenuItem>
    <DropdownMenuItem>
      <Link href="/settings">Settings</Link>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleLogout}>
      Logout
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## Advanced Customization

### Custom Active State Logic

```typescript
// Custom active detection (not just pathname match)
function isItemActive(item: NavItem, pathname: string, search: string): boolean {
  // Match pathname
  if (pathname.startsWith(item.url)) return true

  // Match query params
  if (item.queryKey && search.includes(item.queryKey)) return true

  // Custom logic
  if (item.customMatcher && item.customMatcher(pathname)) return true

  return false
}
```

### Dynamic Module Loading

```typescript
// Load modules dynamically from API instead of database
async function loadModulesFromAPI() {
  const response = await fetch('/api/modules/enabled')
  const modules = await response.json()
  return modules
}

// In layout.tsx
const modules = await loadModulesFromAPI()
```

### Custom Sidebar Animations

```css
/* /app/[locale]/globals.css */

/* Customize sidebar transition */
[data-sidebar] {
  transition-property: width, transform;
  transition-duration: 300ms; /* Change duration */
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); /* Change easing */
}

/* Customize content shift */
[data-sidebar-inset] {
  transition: margin-left 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Mobile-Specific Behavior

```typescript
// Detect mobile and apply custom logic
'use client'

import { useEffect, useState } from 'react'

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

// Usage in component
const isMobile = useMobile()

{isMobile ? (
  // Mobile-specific rendering
) : (
  // Desktop rendering
)}
```

---

## Troubleshooting

### Sidebar Not Appearing

**Possible Causes**:
1. SidebarProvider not wrapping layout
2. AppSidebar not rendered
3. CSS not loaded

**Fix**:
```typescript
// Verify layout.tsx structure
<SidebarProvider>
  <AppSidebar />
  <SidebarInset>
    {children}
  </SidebarInset>
</SidebarProvider>
```

### Module Not Showing in Navigation

**Checklist**:
- [ ] Module exists in database with `enabled = true`
- [ ] Module filtering logic includes your module
- [ ] Localization key exists in locale files
- [ ] No permission/role checks blocking visibility
- [ ] Dev server restarted after code changes

### Active State Not Working

**Possible Causes**:
1. Pathname not matching URL pattern
2. Active state logic broken
3. CSS classes not applied

**Fix**:
```typescript
// Debug active state
const pathname = usePathname()
console.log('Current pathname:', pathname)
console.log('Item URL:', item.url)
console.log('Is active:', pathname.startsWith(item.url))
```

### Sidebar State Not Persisting

**Possible Causes**:
1. localStorage blocked (incognito mode)
2. Storage key mismatch
3. SidebarProvider not managing state

**Fix**:
```typescript
// Check localStorage
console.log(localStorage.getItem('sidebar:state'))

// Manually set state
localStorage.setItem('sidebar:state', 'true') // or 'false'
```

---

## Best Practices

### Do's

✅ **Use Server Components** where possible (layout, static navigation)
✅ **Use Client Components** only when needed (interactive elements, hooks)
✅ **Filter modules** server-side for security
✅ **Use TypeScript** for type safety
✅ **Follow shadcn patterns** for consistency
✅ **Add ARIA attributes** for accessibility
✅ **Test on mobile** devices/simulators
✅ **Use semantic HTML** (nav, aside, main, etc.)
✅ **Localize all text** (no hardcoded strings)
✅ **Document custom logic** with comments

### Don'ts

❌ **Don't bypass module filtering** (security risk)
❌ **Don't use inline styles** (use Tailwind classes)
❌ **Don't hardcode user roles** (use session checks)
❌ **Don't skip accessibility** (keyboard nav, ARIA)
❌ **Don't use custom animations** (use shadcn defaults)
❌ **Don't forget mobile** (test responsive behavior)
❌ **Don't skip TypeScript** types (type safety is important)
❌ **Don't mutate props** (use local state)

---

## Code Style Guide

### Component Structure

```typescript
// 1. Imports
import { Component } from '@/components'
import type { Props } from '@/types'

// 2. Types/Interfaces
interface MyComponentProps {
  items: Item[]
  onAction: () => void
}

// 3. Component
export function MyComponent({ items, onAction }: MyComponentProps) {
  // 4. Hooks (top of component)
  const pathname = usePathname()
  const [state, setState] = useState()

  // 5. Derived values
  const filteredItems = items.filter(...)

  // 6. Event handlers
  const handleClick = () => {
    // ...
  }

  // 7. Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### Naming Conventions

- Components: `PascalCase` (e.g., `AppSidebar`, `NavMain`)
- Functions: `camelCase` (e.g., `getModules`, `handleClick`)
- Files: `kebab-case.tsx` for components (e.g., `app-sidebar.tsx`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `API_URL`)
- Types: `PascalCase` (e.g., `NavItem`, `Module`)

---

## Testing Your Changes

### Manual Testing Checklist

- [ ] Sidebar appears on all pages
- [ ] Navigation items clickable
- [ ] Active state highlights correct item
- [ ] Sidebar collapses/expands smoothly
- [ ] Mobile hamburger menu works
- [ ] Module filtering works (enable/disable modules)
- [ ] Role-based visibility works (admin vs non-admin)
- [ ] Theme switching works
- [ ] No console errors
- [ ] No TypeScript errors: `pnpm tsc --noEmit`

### Writing Tests

See `/testing/TEST_COVERAGE_REVIEW.md` for test examples.

**Test File Location**: `/cypress/e2e/3-layout-migration/your-test.cy.js`

**Example Test**:
```javascript
describe('Your Module Navigation', () => {
  it('shows your module in navigation when enabled', () => {
    cy.visit('/dashboard')
    cy.get('[data-sidebar="menu"]').within(() => {
      cy.contains('Your Module').should('exist')
    })
  })
})
```

---

## Resources

- **shadcn/ui Docs**: https://ui.shadcn.com
- **Next.js App Router**: https://nextjs.org/docs/app
- **Radix UI Primitives**: https://www.radix-ui.com/primitives
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Lucide Icons**: https://lucide.dev

---

## Getting Help

**Documentation**:
- Architecture: `/documentation/architecture.md`
- Known Issues: `/documentation/known-issues.md`
- Testing: `/testing/` directory

**Common Issues**: See "Troubleshooting" section above

**Code Examples**: See "Component Usage Examples" section above

---

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**Task Group**: 6.5.2 - Documentation & Handoff
