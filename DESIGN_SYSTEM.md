# Prisma Design System - Interactive Reference

## Complete Design Specifications & Documentation

**Version:** 1.0.0
**Last Updated:** 2025-11-10
**Status:** Ready for Implementation

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Design Tokens](#design-tokens)
3. [Component Library](#component-library)
4. [Page Layouts](#page-layouts)
5. [Responsive Design](#responsive-design)
6. [Accessibility Standards](#accessibility-standards)
7. [Implementation Guide](#implementation-guide)
8. [Quick Links](#quick-links)

---

## OVERVIEW

### Design Philosophy

- **Audience:** Enterprise developers, database architects, DevOps professionals
- **Primary Use:** Technical education, real-time monitoring, query optimization
- **Aesthetic:** Modern SaaS with data visualization focus
- **Accessibility:** WCAG 2.1 AA compliance minimum
- **Performance:** Optimized for real-time data updates, minimal re-renders

### Core Design Principles

1. **Clarity First** - Information hierarchy emphasizes critical data
2. **Interactive** - Every metric and visualization is explorable
3. **Technical Credibility** - Design supports technical content
4. **Real-time Awareness** - Visual cues indicate live data vs cached
5. **Safety** - Dangerous operations clearly distinguished
6. **Accessibility** - Color not the only indicator
7. **Responsive** - Works from mobile to 4K displays

### Design System Scope

- ✅ 10 Primary Feature Interfaces
- ✅ Shared Component Library (45+ components)
- ✅ Global Navigation & Layout System
- ✅ Data Visualization Templates
- ✅ Form & Input Patterns
- ✅ Status & Alert System
- ✅ Dark Mode (primary) & Light Mode (alternate)

---

## DESIGN TOKENS

### Color Palette

#### Dark Mode (Primary Theme)

**Background Colors:**
- Primary: `#0f1117` (rgb: 15, 17, 23) - Main canvas
- Secondary: `#161b22` (rgb: 22, 27, 34) - Cards, panels
- Tertiary: `#21262d` (rgb: 33, 38, 45) - Subtle elevation
- Elevated: `#30363d` (rgb: 48, 54, 61) - Modals, popovers

**Text Colors:**
- Primary: `#e6edf3` (rgb: 230, 237, 243) - Main text, 100% opacity
- Secondary: `#8b949e` (rgb: 139, 148, 158) - Labels, secondary text
- Tertiary: `#6e7681` (rgb: 110, 118, 129) - Disabled, hints
- Inverse: `#0f1117` (rgb: 15, 17, 23) - Text on light backgrounds

**Accent Colors:**
- Electric Blue: `#00d9ff` (rgb: 0, 217, 255) - Links, CTAs, focus
- Deep Blue: `#0969da` (rgb: 9, 105, 218) - Alternative primary
- Bright Blue: `#1f6feb` (rgb: 31, 110, 251) - Hover states

**Status Colors:**
- Success: `#10b981` (rgb: 16, 185, 129) - Successful operations
- Warning: `#f59e0b` (rgb: 245, 158, 11) - Warnings, optimization
- Error: `#ef4444` (rgb: 239, 68, 68) - Errors, issues
- Info: `#3b82f6` (rgb: 59, 130, 246) - Information, live indicators

**Chart/Data Colors:**
- Series 1: `#00d9ff` (Cyan)
- Series 2: `#10b981` (Emerald)
- Series 3: `#f59e0b` (Amber)
- Series 4: `#3b82f6` (Blue)
- Series 5: `#8b5cf6` (Violet)
- Series 6: `#ec4899` (Pink)

### Typography

**Font Stack:**
```
Sans-serif (Primary):
-apple-system, BlinkMacSystemFont, "Segoe UI",
"Helvetica Neue", Arial, sans-serif

Monospace (Code):
"Courier New", Courier, monospace
Fallbacks: Monaco, Menlo, "Ubuntu Mono"
```

**Type Scale:**

| Scale | Size | Weight | Line Height | Use Case |
|-------|------|--------|-------------|----------|
| Display Large | 48px | 700 | 56px | Page titles |
| Display Medium | 40px | 700 | 48px | Section headers |
| Heading Large | 32px | 700 | 40px | Feature titles |
| Heading Medium | 24px | 600 | 32px | Card titles |
| Heading Small | 20px | 600 | 28px | Component titles |
| Body Large | 16px | 400 | 24px | Primary text |
| Body Medium | 14px | 400 | 20px | Secondary text |
| Body Small | 12px | 400 | 16px | Hints, metadata |
| Code Large | 14px | 400 | 20px | Code blocks |
| Code Small | 12px | 400 | 16px | Inline code |
| Label | 12px | 600 | 16px | UI labels |

### Spacing System

**Base Unit:** 8px

| Token | Value | Use Case |
|-------|-------|----------|
| xs | 4px | Fine spacing |
| sm | 8px | Base unit |
| md | 12px | Medium spacing |
| lg | 16px | Component spacing |
| xl | 24px | Section spacing |
| xxl | 32px | Major spacing |
| 3xl | 48px | Large sections |
| 4xl | 64px | Page sections |

**Component Padding Standards:**
- Button: 8px vertical × 16px horizontal
- Input Field: 8px vertical × 12px horizontal
- Card: 24px all sides
- Modal: 32px all sides

### Elevation & Shadows

**Shadow Depth System:**

```
Depth 1 (Subtle):
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12),
            0 1px 2px rgba(0, 0, 0, 0.24);
Use: Buttons, inputs, small cards

Depth 2 (Medium):
box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16),
            0 3px 6px rgba(0, 0, 0, 0.23);
Use: Cards, panels, dropdowns

Depth 3 (High):
box-shadow: 0 10px 20px rgba(0, 0, 0, 0.19),
            0 6px 6px rgba(0, 0, 0, 0.23);
Use: Modals, popovers

Depth 4 (Maximum):
box-shadow: 0 15px 25px rgba(0, 0, 0, 0.15),
            0 5px 10px rgba(0, 0, 0, 0.05);
Use: Full-screen modals

Focus Ring:
box-shadow: 0 0 0 3px rgba(0, 217, 255, 0.25);
Use: Keyboard focus indicators
```

### Border System

**Border Radius:**
- None: 0px
- Small: 4px (inputs, badges)
- Medium: 8px (buttons, cards)
- Large: 12px (panels)
- Extra Large: 16px (sections)
- Full: 9999px (pills)

**Border Colors (Dark Mode):**
- Primary: `#30363d`
- Secondary: `#21262d`
- Subtle: `#0d1117`

### Animation Tokens

**Timing Functions:**
- Ease-In: `cubic-bezier(0.4, 0, 1, 1)` - Emphasis
- Ease-Out: `cubic-bezier(0, 0, 0.2, 1)` - Natural exit
- Ease-In-Out: `cubic-bezier(0.4, 0, 0.2, 1)` - Complex
- Linear: `linear` - Continuous motion

**Durations:**
- Instant: 0ms
- Fast: 100ms (hover, focus)
- Standard: 200ms (state changes)
- Slow: 300ms (transitions)
- Extra-Slow: 500ms (entrance)

---

## COMPONENT LIBRARY

### Complete Component List (45+)

#### Buttons (4 families)
- Primary Button
- Secondary Button
- Tertiary Button
- Icon Button

**States:** Default, Hover, Active, Disabled, Focus
**Sizes:** Small (28px), Medium (36px), Large (44px), Extra-Large (52px)

#### Form Inputs (8 components)
- Text Input
- Text Area
- Select/Dropdown
- Checkbox
- Radio Button
- Toggle Switch
- Search Input
- Date/Time Input

**States:** Default, Hover, Focus, Filled, Disabled, Error, Success, Loading

#### Cards & Containers (5 components)
- Standard Card
- Metric Card
- Alert Card
- Panel/Container
- Loading Card

#### Navigation (5 components)
- Top Navigation Bar
- Sidebar Navigation
- Tabs
- Breadcrumb
- Pagination

#### Data Display (3 components)
- Table
- List Item
- Badge

#### Feedback & Overlays (4 components)
- Modal
- Toast/Alert
- Loading States
- Popover

#### Miscellaneous (2+ components)
- Status Indicator
- Avatar

**Total:** 45+ components with complete specifications

---

## PAGE LAYOUTS

### 10 Major Features

1. **Dashboard Main** - Overview with metrics and quick actions
2. **Schema Explorer** - Interactive schema visualization
3. **Query Playground** - Real-time query execution
4. **Multi-Tenant Simulation** - Tenant management interface
5. **Performance Benchmarking** - Performance testing tools
6. **Migration Simulator** - Schema migration workflow
7. **Security Testing** - Security verification interface
8. **Code Pattern Library** - Searchable pattern collection
9. **Monitoring Dashboard** - Real-time metrics and logs
10. **Deployment Generator** - Configuration generator
11. **Troubleshooting Guide** - Issue navigator

**Each layout includes:**
- Desktop variant (1440px+)
- Tablet variant (768px)
- Mobile variant (375px)
- All component placements
- Responsive behavior documentation

---

## RESPONSIVE DESIGN

### Breakpoints

| Breakpoint | Range | Device | Primary Use |
|-----------|-------|--------|------------|
| xs | 0-640px | Mobile portrait | Stacked layouts |
| sm | 641-768px | Mobile landscape | Basic multi-column |
| md | 769-1024px | Tablet | Multi-column |
| lg | 1025-1280px | Desktop | Full features |
| xl | 1281-1536px | Large desktop | Maximum density |
| 2xl | 1537px+ | Extra large | 4K displays |

### Responsive Behavior

**Navigation:**
- xs: Hamburger menu, logo icon only
- md: Sidebar collapsed, toggle visible
- lg+: Full sidebar visible, expanded

**Grid System:**
- xs: 1 column
- sm: 2 columns (if needed)
- md: 2-3 columns
- lg: 3-4 columns
- xl: 4+ columns

**Touch Targets:**
- Minimum: 48px × 48px on mobile
- Optimal: 56px × 56px
- Desktop: 36px minimum acceptable

---

## ACCESSIBILITY STANDARDS

### WCAG 2.1 AA Compliance

**Color Contrast:**
- Normal text: 4.5:1 minimum
- Large text (18px+): 3:1 minimum
- UI components: 3:1 minimum

**Keyboard Navigation:**
- All interactive elements keyboard accessible
- Logical tab order
- No keyboard traps
- Focus indicators visible

**Screen Reader Support:**
- Semantic HTML used
- ARIA labels where needed
- Form labels associated
- Headings hierarchical
- Live regions for updates

**Focus Indicators:**
- Visible on all interactive elements
- 2px minimum width
- 2:1 contrast minimum
- Never hidden

---

## IMPLEMENTATION GUIDE

### Getting Started

1. **Review this specification** - Understand design system
2. **Access Figma files** - Design specifications
3. **Setup development environment** - Install dependencies
4. **Create component scaffolding** - Use provided templates
5. **Implement components** - Follow specifications exactly
6. **Test thoroughly** - Unit, accessibility, visual tests
7. **QA verification** - Complete testing checklist
8. **Launch** - Deploy to production

### Quick Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Run linter
pnpm lint
```

---

## QUICK LINKS

- 📋 [Design Tokens Reference](./docs/DESIGN_TOKENS.md)
- 🎨 [Component Specifications](./docs/COMPONENTS.md)
- 📐 [Layout Guide](./docs/LAYOUTS.md)
- 📱 [Responsive Design](./docs/RESPONSIVE.md)
- ♿ [Accessibility Guide](./docs/ACCESSIBILITY.md)
- 🚀 [Implementation Roadmap](./docs/IMPLEMENTATION_ROADMAP.md)
- 📊 [Component Inventory](./docs/COMPONENTS_INVENTORY.md)
- ✅ [QA Checklist](./docs/QA_CHECKLIST.md)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-10 | Initial comprehensive specification |

---

**Status:** ✅ Ready for Implementation
**Approval:** Pending stakeholder sign-off
**Next Steps:** Create Figma files, begin component development
