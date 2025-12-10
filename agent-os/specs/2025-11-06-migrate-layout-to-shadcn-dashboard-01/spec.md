# Specification: Layout Migration to shadcn dashboard-01

## Goal

Migrate NextCRM's main application layout to use the shadcn/ui dashboard-01 block design pattern, replacing the current custom sidebar/header implementation with a modern, mobile-first design that provides consistent navigation across all modules while preserving existing functionality like module filtering, role-based access, and internationalization.

## User Stories

- As a user, I want a responsive sidebar navigation that collapses on mobile devices so that I can access the app comfortably on any screen size
- As a user, I want consistent navigation patterns across all modules so that I can navigate the app intuitively
- As an admin, I want to see admin-only navigation items so that I can access administrative functions
- As a user, I want my enabled modules to appear in the sidebar so that I only see features available to me
- As a user, I want to see the build version in the sidebar footer so that I know which version I'm running
- As a user, I want quick access to search, commands, and settings from the header so that I can work efficiently

## Core Requirements

### Layout Structure
- Replace custom sidebar with shadcn sidebar component installed via MCP
- Implement mobile-first responsive design using SidebarTrigger for mobile menu
- Preserve company logo and "N" branding symbol in sidebar header
- Move footer from layout wrapper into scrollable content area
- Maintain header with reorganized components for optimal UX

### Navigation System
- Convert dropdown-based navigation (CRM, Projects, etc.) to expandable sidebar sections using shadcn collapsible patterns
- Filter navigation items based on enabled modules from system_Modules_Enabled table
- Apply role-based visibility (is_admin, is_account_admin) to appropriate menu items
- Display build version in sidebar footer section when expanded
- Support internationalization (next-intl) for all navigation labels

### Component Organization
- Header components to reorganize: FulltextSearch, CommandComponent, SetLanguage, Feedback, ThemeToggle, SupportComponent, AvatarDropdown
- Consider moving appropriate components to sidebar nav-user section if it improves UX
- All modules must use consistent layout pattern: Dashboard, CRM, Projects, Emails, SecondBrain, Employees, Invoice, Reports, Documents, Databox, OpenAI, Admin

### Design Consistency
- Update all Sheet components across the application to match new design system
- Update all Dialog components to align with new layout aesthetic
- Use shadcn default animations and transitions throughout
- Maintain theme switching (light/dark mode) functionality

## Visual Design

**Reference Design**: https://ui.shadcn.com/blocks#dashboard-01

**Key UI Elements**:
- Collapsible sidebar with logo/brand area at top
- Navigation sections with expandable groups for modules
- User profile section (nav-user) in sidebar
- Mobile-responsive with sheet overlay behavior
- Header bar with search and utility components
- Content area with proper scroll behavior
- Footer placed inside content area

**Responsive Breakpoints**:
- Mobile: Sidebar collapses to hamburger menu using SidebarTrigger
- Tablet/Desktop: Full sidebar with collapse/expand toggle
- Preserve "N" branding symbol in collapsed state

**Brand Elements to Preserve**:
- Company logo (NEXT_PUBLIC_APP_NAME)
- "N" symbol with rotation animation on toggle
- Build version display format: "build: 0.0.3-beta-{build}"

## Reusable Components

### Existing shadcn/ui Components to Leverage
- avatar.tsx - For user profile display
- button.tsx - For navigation triggers and actions
- dropdown-menu.tsx - May be used in header components
- separator.tsx - For visual separation in sidebar
- sheet.tsx - For mobile sidebar overlay
- scroll-area.tsx - For scrollable navigation
- command.tsx - Already exists for CommandComponent
- dialog.tsx - For modal interactions

### Existing Patterns to Model After
- Module filtering pattern from ModuleMenu.tsx (lines 65-118)
- Module menu item structure from Crm.tsx, Administration.tsx
- Header component organization from Header.tsx
- Role-based rendering patterns from admin users module

### New Components Required
- **Sidebar Component** (via shadcn MCP installation)
  - Why new: Current ModuleMenu.tsx uses custom implementation; need official shadcn sidebar with built-in responsive behavior, animations, and accessibility

- **App Shell Layout Wrapper**
  - Why new: Need proper SidebarProvider and layout structure following dashboard-01 pattern

- **Navigation Group Components**
  - Why new: Current DropdownMenu-based navigation needs conversion to collapsible sidebar sections

- **Nav-User Section Component**
  - Why new: Consolidate user-related actions (avatar, settings, logout) in sidebar footer area

- **Mobile Navigation Trigger**
  - Why new: Replace custom collapse button with shadcn SidebarTrigger for consistent mobile UX

## Technical Approach

### Installation Phase
1. Use shadcn MCP to install sidebar component: `npx shadcn@latest add sidebar`
2. Verify all required dependencies are installed (@radix-ui/react-* packages)

### Architecture Changes
1. **Main Layout** (`/app/[locale]/(routes)/layout.tsx`)
   - Replace current flex-based layout with SidebarProvider wrapper
   - Integrate app-sidebar component
   - Move header inside SidebarInset
   - Move footer into children content area
   - Maintain session checks and user status redirects

2. **Sidebar Component** (new: `/app/[locale]/(routes)/components/app-sidebar.tsx`)
   - Implement SidebarHeader with logo and brand
   - Create navigation sections for each module type
   - Integrate module filtering logic from getModules()
   - Add role-based conditional rendering
   - Include nav-user section with profile components
   - Add build version in SidebarFooter

3. **Navigation Structure**
   - Convert each module menu (CrmModuleMenu, ProjectModuleMenu, etc.) to SidebarGroup with CollapsibleContent
   - Map dropdown items to SidebarMenuItem components
   - Preserve current routing and active state detection
   - Maintain internationalization via dict parameter

4. **Header Reorganization**
   - Keep FulltextSearch prominent (left side)
   - Group utility components logically (right side)
   - Consider moving user profile to sidebar nav-user
   - Maintain all existing functionality (ThemeToggle, SetLanguage, etc.)

5. **Role-Based Access**
   - Check session.user.is_admin for admin-only items (Administration menu)
   - Check session.user.is_account_admin for account admin features
   - Filter navigation items server-side where possible
   - Hide/show menu items based on role checks

6. **Module System Integration**
   - Continue using getModules() to fetch enabled modules
   - Filter navigation sections based on module.enabled flag
   - Maintain module ordering via position field
   - Support dynamic module enable/disable without code changes

### Data Flow
1. Server Component (layout.tsx) fetches session, modules, build version
2. Pass data to app-sidebar component
3. Sidebar renders navigation based on modules and roles
4. Client-side state manages sidebar open/collapsed state
5. Internationalization applied via next-intl dictionary

### File Structure
```
/app/[locale]/(routes)/
├── layout.tsx (updated - SidebarProvider wrapper)
├── components/
│   ├── app-sidebar.tsx (new - main sidebar component)
│   ├── nav-main.tsx (new - primary navigation section)
│   ├── nav-user.tsx (new - user profile section)
│   ├── nav-secondary.tsx (new - secondary nav/build info)
│   ├── Header.tsx (updated - reorganized components)
│   └── Footer.tsx (updated - for content area placement)
│   └── menu-items/ (updated - convert to sidebar items)
│       ├── Crm.tsx (updated)
│       ├── Projects.tsx (updated)
│       ├── Administration.tsx (updated)
│       └── ... (all other modules)
└── [module]/ (no layout changes, inherit from main)
```

### Module Sub-Layouts
- Remove any module-specific layout overrides that conflict with new design
- Ensure module pages inherit proper styling from main layout
- Update any module-specific Sheets/Dialogs to match new design system
- Test each module for layout consistency

## Implementation Phases

### Phase 1: Foundation (Core Sidebar)
1. Install shadcn sidebar component via MCP
2. Create app-sidebar.tsx with basic structure
3. Update main layout.tsx to use SidebarProvider
4. Implement logo/brand header section
5. Test responsive behavior and mobile menu

### Phase 2: Navigation Migration
1. Create nav-main.tsx for primary navigation
2. Convert Dashboard menu to sidebar item
3. Convert CRM dropdown to expandable sidebar group
4. Convert Projects, Emails, and other module menus
5. Implement active state detection
6. Apply internationalization

### Phase 3: User & Utility Components
1. Create nav-user.tsx section
2. Move/reorganize header components
3. Implement nav-secondary for build version
4. Update Footer.tsx for content area placement
5. Test theme switching across new layout

### Phase 4: Access Control & Filtering
1. Implement role-based navigation visibility
2. Test admin vs non-admin user views
3. Verify module filtering logic
4. Test with different module enable/disable combinations

### Phase 5: Design Consistency
1. Audit all Sheet components across modules
2. Update Sheet styles to match new design
3. Audit all Dialog components
4. Standardize spacing, colors, animations
5. Update any custom animations to use shadcn defaults

### Phase 6: Testing & Polish
1. Test all navigation paths
2. Verify mobile responsiveness on multiple devices
3. Test keyboard navigation and accessibility
4. Verify internationalization across all languages
5. Performance testing and optimization

## Out of Scope

- Team/organization switcher functionality (future enhancement)
- Major feature additions beyond layout migration
- Backend API changes (unless required for layout data)
- Database schema modifications
- Changes to module business logic
- Notification system overhaul
- Search functionality enhancements
- Email client feature changes
- Project management feature changes
- CRM feature modifications

## Success Criteria

### Functional Requirements
- Sidebar component installed via shadcn MCP and functional
- Mobile-first responsive design works on all screen sizes (mobile, tablet, desktop)
- Logo and "N" symbol preserved and properly branded
- All header components functional and well-organized
- Navigation uses shadcn default patterns (no custom duration classes)
- Footer moved inside content area and renders correctly
- Role-based navigation properly shows/hides admin items
- Build version displays in sidebar footer when expanded
- Module filtering works (enabled modules show in navigation)
- All module routes accessible and consistent in design

### User Experience
- Smooth animations using shadcn defaults
- Intuitive navigation with clear visual hierarchy
- Quick access to search and utility functions
- Consistent feel across all modules
- Proper active state indicators
- Theme switching (light/dark) works seamlessly
- Internationalization displays correct translations

### Technical Quality
- No TypeScript errors in strict mode
- Proper Next.js 15 App Router patterns
- Server Components used where appropriate
- Client Components only when needed ("use client")
- Proper session handling and redirects
- Clean separation of concerns
- Maintainable component structure
- Performance meets or exceeds current implementation

### Design Consistency
- All Sheets match new design system
- All Dialogs align with new aesthetic
- Consistent spacing and typography
- Proper use of shadcn/ui patterns
- No visual regressions across modules
- Responsive breakpoints work correctly
- Animations are smooth and consistent

### Compatibility
- Works with existing authentication flow (NextAuth)
- Compatible with current module system
- Maintains internationalization (next-intl)
- No breaking changes to existing features
- Database queries unchanged
- API routes unaffected
- Existing user preferences preserved
