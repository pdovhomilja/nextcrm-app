# Requirements Document
## Layout Migration to shadcn dashboard-01

**Date**: 2025-11-06
**Spec Folder**: 2025-11-06-migrate-layout-to-shadcn-dashboard-01

---

## Feature Description

Migrate the main application layout to use the shadcn/ui dashboard-01 block design pattern, providing a modern sidebar navigation, header, and content area structure that is consistent across all modules.

**Target Design**: https://ui.shadcn.com/blocks#dashboard-01

---

## Key Decisions & Requirements

### 1. Sidebar Component Installation
✅ **Decision**: Use shadcn MCP to install the sidebar component
- Install official shadcn/ui sidebar component via MCP
- Leverage shadcn's built-in patterns and best practices

### 2. Module-Based Navigation
✅ **Decision**: Best UX experience over strict preservation
- Module system filtering will be maintained but structure optimized for UX
- Collapsible sections for module groups where it improves navigation
- Simplified navigation where appropriate

### 3. Mobile Responsiveness
✅ **Decision**: Mobile-first approach with shadcn SidebarTrigger
- Replace custom collapse button with shadcn SidebarTrigger
- **PRESERVE**: Company logo and "N" symbol branding
- Use shadcn's mobile sheet behavior for better touch interactions
- Prioritize mobile UX in all layout decisions

### 4. Header Component Integration
✅ **Decision**: Reorganize for best UX experience
- Current header components: FulltextSearch, CommandComponent, SetLanguage, Feedback, ThemeToggle, SupportComponent, AvatarDropdown
- Open to moving components to sidebar's nav-user section if it improves UX
- Optimize horizontal layout and component grouping

### 5. Navigation Structure
✅ **Decision**: Use shadcn defaults as much as possible
- Convert dropdown menus to expandable sidebar sections where appropriate
- Leverage shadcn's collapsible navigation patterns (nav-main)
- Minimize custom implementations

### 6. Team Switcher / Organization Selector
✅ **Decision**: Keep without team switching for now
- Maintain simple app branding with logo
- No team/organization switcher implementation
- Future enhancement possibility

### 7. Footer Placement
✅ **Decision**: Move footer inside content area
- Remove from main layout wrapper
- Place within scrollable content region

### 8. User Role-Based Visibility
✅ **Decision**: Understand and implement existing app logic
- Analyze current role system and permissions
- Maintain existing role-based access control
- Apply to navigation items appropriately
- Admin-only items should be properly gated

### 9. Build Version Display
✅ **Decision**: Place in sidebar footer area
- Move "build: 0.0.3-beta-{build}" to sidebar nav-secondary section
- Display when sidebar is expanded

### 10. Existing Layout Components to Preserve
✅ **Decision**: No specific components must be preserved
- Full flexibility to modernize and improve
- Focus on consistent shadcn/ui patterns

### 11. Animation and Transitions
✅ **Decision**: Use shadcn default animations
- Remove custom duration/animation classes
- Leverage shadcn sidebar's built-in transitions
- Consistent animation behavior across components

### 12. Scope Boundaries
✅ **Decision**: Comprehensive migration across all modules
- **INCLUDE**: Main app layout `/app/[locale]/(routes)/layout.tsx`
- **INCLUDE**: All module sub-layouts (CRM, Projects, Invoice, Documents, Emails, Employees, Reports, SecondBrain)
- **GOAL**: Modern, consistent appearance across entire application
- **CONSISTENCY**: All Sheets, Dialogs, and components should match new design system

---

## Technical Constraints

### Framework & Stack
- Next.js 15 with App Router
- React 19
- TypeScript (strict mode)
- Tailwind CSS
- shadcn/ui components
- next-intl for internationalization

### Existing Systems to Integrate
- Module system (Modules table controls feature availability)
- Role-based access control (user roles determine visibility)
- Internationalization (next-intl locale routing)
- Theme system (light/dark mode via next-themes)

### Current Architecture
- Layouts in `/app/[locale]/(routes)` and module subdirectories
- Header component with multiple utilities
- Sidebar with module-based navigation
- Footer component

---

## Success Criteria

1. ✅ Sidebar component installed via shadcn MCP
2. ✅ Mobile-first responsive design working across all devices
3. ✅ Logo and "N" symbol preserved in branding
4. ✅ Header components reorganized for optimal UX
5. ✅ Navigation uses shadcn default patterns
6. ✅ Footer moved inside content area
7. ✅ Role-based navigation properly implemented
8. ✅ Build version displayed in sidebar footer
9. ✅ Consistent design across all modules (CRM, Projects, Invoice, etc.)
10. ✅ All Sheets, Dialogs, and components updated to match new design
11. ✅ Module system integration maintained
12. ✅ Internationalization continues to work
13. ✅ Theme switching (light/dark) functions properly

---

## Out of Scope

- Team/organization switcher functionality
- Major feature additions beyond layout migration
- Backend/API changes (unless required for layout functionality)
- Database schema modifications

---

## Visual Assets

**Location**: `/planning/visuals/`
**Status**: No visual assets provided

User to optionally add:
- Current layout screenshots
- Desired modifications
- Mobile view preferences
- Custom design references

---

## Next Steps

1. Review and approve requirements
2. Run `/write-spec` to generate detailed specification document
3. Create implementation tasks list
4. Begin development
