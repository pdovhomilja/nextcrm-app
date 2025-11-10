# Figma File Structure & Setup Guide

**Complete guide for organizing the design system in Figma**

---

## PROJECT SETUP

### Figma Project Structure

```
Workspace: Prisma Design System
│
├── Project 1: Design System - Main (ACTIVE)
│   ├── 00_README & Navigation
│   ├── 01_Design Tokens
│   ├── 02_Components - Part 1
│   ├── 02_Components - Part 2
│   ├── 02_Components - Part 3
│   ├── 03_Layouts - Dashboard & Explorer
│   ├── 03_Layouts - Features
│   ├── 03_Layouts - Advanced
│   ├── 04_Icons & Illustrations
│   ├── 05_Styles & Tokens Library
│   ├── 06_Prototypes
│   └── 07_Responsive Variants
│
├── Project 2: Component Library (Hand-off)
│   └── All components in developer-friendly format
│
└── Project 3: Archives
    └── Previous versions, reference files
```

---

## DETAILED FILE STRUCTURE

### File 1: 00_README & Navigation

**Purpose:** Welcome and navigation guide

**Contents:**
```
Frames:

1. Welcome Page
   - Project title and description
   - Quick start guide
   - Navigation overview
   - Contact information
   - Version history

2. Navigation Guide
   - File overview
   - What to find where
   - How to use this design system
   - Link to each file/section

3. Design System Principles
   - Clarity first
   - Interactive by default
   - Technical credibility
   - Real-time awareness
   - Accessibility-first
   - Responsive design

4. Quick Links
   - Components page
   - Tokens page
   - Layouts page
   - Icon library page

5. Contact & Support
   - Design lead contact
   - Slack channel: #design-system
   - Office hours
   - Issue reporting process
```

### File 2: 01_Design Tokens

**Purpose:** All design tokens in visual form

**Page Structure:**

```
Page: Colors
├── Frame: Dark Mode Palette
│   ├── Background colors (4 swatches with hex)
│   ├── Text colors (4 swatches with hex)
│   ├── Accent colors (3 swatches with hex)
│   ├── Status colors (4 swatches with hex)
│   └── Chart colors (6 swatches with hex)
│
├── Frame: Color Contrast Matrix
│   ├── Text on backgrounds table
│   ├── Accessibility ratings
│   └── Pass/fail indicators
│
└── Frame: Color Usage Guidelines
    ├── Background usage examples
    ├── Text usage examples
    ├── Status usage examples
    └── Chart usage examples

Page: Typography
├── Frame: Type Scale
│   ├── Display Large (example)
│   ├── Display Medium (example)
│   ├── Heading Large (example)
│   ├── Heading Medium (example)
│   ├── Heading Small (example)
│   ├── Body Large (example)
│   ├── Body Medium (example)
│   ├── Body Small (example)
│   ├── Code Large (example)
│   ├── Code Small (example)
│   └── Label (example)
│
├── Frame: Font Stack
│   ├── Sans-serif display
│   ├── Monospace display
│   └── Fallbacks listed
│
└── Frame: Type in Context
    ├── Heading with body text
    ├── Label with body text
    └── Code examples

Page: Spacing
├── Frame: Spacing Scale
│   └── All spacing tokens displayed with measurements
│
├── Frame: Component Padding
│   ├── Button padding example
│   ├── Input padding example
│   ├── Card padding example
│   └── Modal padding example
│
└── Frame: Layout Spacing
    ├── Section gaps
    ├── Component gaps
    └── Grid spacing

Page: Shadows & Effects
├── Frame: Shadow Depths
│   ├── Depth 1 example
│   ├── Depth 2 example
│   ├── Depth 3 example
│   └── Depth 4 example
│
├── Frame: Focus Indicators
│   └── Focus ring on various elements
│
└── Frame: Border Radius
    └── All radius tokens displayed

Page: Animations
├── Frame: Timing Functions
│   └── Ease curves visualized
│
├── Frame: Durations
│   ├── Fast animations
│   ├── Standard animations
│   └── Slow animations
│
└── Frame: Animation Examples
    ├── Button interaction animation
    ├── Modal entrance animation
    └── Toast notification animation

Page: Breakpoints
├── Frame: Responsive Breakpoints
│   ├── xs (mobile)
│   ├── sm (mobile landscape)
│   ├── md (tablet)
│   ├── lg (desktop)
│   ├── xl (large desktop)
│   └── 2xl (extra large)
│
└── Frame: Grid at Each Breakpoint
    ├── 1 column (mobile)
    ├── 2 columns (tablet)
    ├── 3 columns (desktop)
    └── 4+ columns (large)
```

### Files 3-5: 02_Components (3 files)

**File Organization:** Components split into 3 files for performance

**File 1: 02_Components - Part 1**

```
Page: Buttons
├── Primary Button
│   ├── Default state
│   ├── Hover state
│   ├── Active state
│   ├── Disabled state
│   ├── Focus state
│   ├── Size: Small (28px)
│   ├── Size: Medium (36px)
│   ├── Size: Large (44px)
│   ├── Size: Extra-Large (52px)
│   └── Spec annotations

├── Secondary Button
│   └── [All states and sizes]

├── Tertiary Button
│   └── [All states and sizes]

└── Icon Button
    ├── [All sizes]
    ├── [With 8 different icons]
    └── [All states]

Page: Form Inputs
├── Text Input
│   ├── Default
│   ├── Hover
│   ├── Focus
│   ├── Filled
│   ├── Disabled
│   ├── Error
│   ├── Success
│   ├── Loading
│   ├── With label
│   ├── With helper text
│   ├── With error message
│   └── Spec annotations

├── Text Area
│   └── [All states]

├── Checkbox
│   ├── Unchecked
│   ├── Checked
│   ├── Indeterminate
│   ├── All states (hover, focus, disabled)
│   ├── With label
│   └── Spec annotations

├── Radio Button
│   └── [Similar structure]

├── Toggle Switch
│   ├── Off state
│   ├── On state
│   ├── All states
│   ├── With label
│   └── Spec annotations

└── Select Dropdown
    ├── Closed default
    ├── Closed hover
    ├── Open state
    ├── Option variants
    ├── All states
    └── Spec annotations
```

**File 2: 02_Components - Part 2**

```
Page: Cards & Containers
├── Standard Card
│   ├── Basic card
│   ├── With header
│   ├── With footer
│   ├── Full structure
│   ├── Hover state
│   ├── Active state
│   ├── Sizes (compact, standard, large)
│   └── Spec annotations

├── Metric Card
│   ├── Label and value
│   ├── With trend indicator
│   ├── With sparkline chart
│   ├── Success variant
│   ├── Warning variant
│   ├── Error variant
│   └── Spec annotations

├── Alert Card
│   ├── Success state
│   ├── Warning state
│   ├── Error state
│   ├── Info state
│   ├── With close button
│   └── Spec annotations

└── Modal Component
    ├── Header section
    ├── Body content
    ├── Footer section
    ├── Close button
    ├── All sizes
    └── Spec annotations

Page: Navigation
├── Top Navigation Bar
│   ├── Full width layout
│   ├── Logo area
│   ├── Search bar
│   ├── Right menu area
│   ├── Responsive variants
│   └── Spec annotations

├── Sidebar Navigation
│   ├── Expanded state (240px)
│   ├── Collapsed state (64px)
│   ├── Nav item states
│   ├── Active indicators
│   ├── Badge indicators
│   └── Spec annotations

├── Tabs
│   ├── Tab buttons
│   ├── Active/inactive states
│   ├── With icons
│   ├── With badges
│   └── Spec annotations

└── Breadcrumb
    └── [Structure and states]

Page: Data Display & Feedback
├── Table Component
│   ├── Header row
│   ├── Data cells
│   ├── Footer row
│   ├── Row states
│   ├── Pagination
│   ├── Responsive variant
│   └── Spec annotations

├── List Item
│   └── [States and variants]

├── Badge
│   ├── All status colors
│   ├── With icon
│   ├── Outline variant
│   ├── Closeable variant
│   └── Spec annotations

├── Toast Notification
│   ├── Success toast
│   ├── Error toast
│   ├── Warning toast
│   ├── Info toast
│   ├── With close button
│   └── Spec annotations

└── Loading States
    ├── Spinner
    ├── Progress bar
    ├── Skeleton screen
    └── Spec annotations
```

**File 3: 02_Components - Part 3**

```
Page: Additional Components
├── Pagination Component
├── Status Indicator
├── Avatar Component
├── Popover Component
├── And any other UI elements

Page: Component States Reference
├── Hover states examples
├── Active states examples
├── Disabled states examples
├── Focus states examples
├── Error states examples
├── Success states examples
└── Loading states examples

Page: Component Documentation
├── Component API reference
├── Props documentation
├── Usage guidelines
├── Do's and Don'ts
├── Accessibility notes
└── Performance tips
```

### Files 6-8: 03_Layouts (3 files)

**File 1: 03_Layouts - Dashboard & Explorer**

```
Page: Dashboard Main Layout
├── Desktop variant (1920×1080)
│   ├── Top navigation
│   ├── Sidebar navigation
│   ├── Metric cards grid (4 columns)
│   ├── Quick action buttons
│   ├── Feature highlight cards
│   └── Component labels
│
├── Tablet variant (768×1024)
│   ├── Responsive layout
│   ├── 2-column metrics
│   ├── Stacked features
│   └── Responsive notes
│
└── Mobile variant (375×812)
    ├── Full-width layout
    ├── Single column
    ├── Stacked sections
    └── Responsive notes

Page: Schema Explorer Layout
├── Desktop variant
│   ├── Models tree (left)
│   ├── Detail view (right)
│   ├── Component placement
│   └── Responsive behavior notes
│
├── Tablet variant
├── Mobile variant
└── Responsive notes

Page: Layout Specifications
├── Spacing annotations
├── Component sizing
├── Responsive breakpoints
├── Grid information
└── Notes for developers
```

**File 2: 03_Layouts - Features**

```
Page: Query Playground
├── Code editor area
├── Results area
├── Performance metrics
├── All responsive variants

Page: Multi-Tenant Simulation
├── Tabs layout
├── Form areas
├── Tables
├── Isolation diagram
├── All responsive variants

Page: Performance Benchmarking
├── Benchmark controls
├── Results display
├── Charts
├── All responsive variants

Page: Migration Simulator
├── Version timeline
├── Step-by-step details
├── SQL code block
├── All responsive variants

Page: Monitoring Dashboard
├── Header metrics
├── Tabs
├── Query logs
├── Performance charts
└── All responsive variants
```

**File 3: 03_Layouts - Advanced**

```
Page: Security Testing Interface
Page: Code Pattern Library
Page: Deployment Generator
Page: Troubleshooting Guide
Page: Additional Feature Layouts

Each with:
- Desktop variant
- Tablet variant
- Mobile variant
- Component placement labels
- Responsive behavior notes
```

### File 9: 04_Icons & Illustrations

**Purpose:** Icon library and illustrations

**Page Structure:**

```
Page: Icon Library
├── Frame: Navigation Icons (8)
│   ├── Dashboard
│   ├── Schema
│   ├── Query
│   ├── Tenant
│   ├── Code
│   ├── Performance
│   ├── Migrate
│   └── Security

├── Frame: Common Icons (20+)
│   ├── Search, Menu, Close
│   ├── Settings, Notifications
│   ├── User, LogOut, Help
│   ├── Checkmark, Error, Warning
│   ├── Loading, Copy, Download
│   ├── Upload, Edit, Delete
│   ├── View, Hide, More
│   └── ... additional icons

├── Frame: Directional Icons (6)
│   ├── ChevronUp, ChevronDown
│   ├── ChevronLeft, ChevronRight
│   ├── ArrowUp, ArrowDown

├── Frame: Data Icons (8)
│   ├── BarChart, LineChart, PieChart
│   ├── Table, Database, Server
│   ├── Cloud, Network

└── Frame: Status Icons (6)
    ├── CheckCircle, AlertCircle
    ├── XCircle, InfoCircle
    ├── Clock, Pulse

Page: Icon Sizes
├── 16px size (small)
├── 20px size (standard)
├── 24px size (large)
├── 32px size (extra-large)

Page: Icon States
├── Default color
├── Hover color
├── Active color
├── Disabled color

Page: Illustrations
├── Empty state illustrations (6)
├── Hero graphics (3)
├── Concept illustrations (4)
├── Infographics (5)
└── All with sizing annotations
```

### File 10: 05_Styles & Tokens Library

**Purpose:** Exported design assets and tokens

**Contents:**

```
Page: Color Styles
├── All color tokens as Figma styles
├── Named consistently
├── Organized by category
└── Hex values visible

Page: Typography Styles
├── All type scales as Figma styles
├── Font families
├── Font sizes
├── Font weights
└── Line heights

Page: Effect Styles
├── Shadow styles
├── Border styles
├── Blur effects

Page: Exported Tokens
├── Design tokens JSON export
├── CSS variables export
├── Tailwind config reference
└── Download links
```

### File 11: 06_Prototypes

**Purpose:** Interactive prototypes and animations

**Contents:**

```
Page: Navigation Prototype
├── Sidebar toggle interaction
├── Tab switching
├── Menu interactions

Page: Component Interactions
├── Modal open/close
├── Toast appearance
├── Dropdown interaction
├── Form submission flow

Page: Page Transitions
├── Dashboard to Schema Explorer
├── Query Playground navigation
├── Multi-page flows

Page: Animation Examples
├── Button hover animation preview
├── Loading spinner animation
├── Transition animations

Note: These are visual previews; actual animations
implemented in code during development phase.
```

### File 12: 07_Responsive Variants

**Purpose:** Show responsive behavior at each breakpoint

**Page Structure:**

```
Page: Mobile Variants (xs - 375px)
├── All 10+ layouts at 375px width
├── Full-width content
├── Stacked components
├── Hamburger menu
└── Touch-optimized sizing

Page: Mobile Landscape (sm - 641px)
├── 2-column layouts
├── Adjusted padding
└── Optimized for landscape

Page: Tablet Variants (md - 768px)
├── All layouts at tablet size
├── 2-3 column layouts
├── Sidebar visible/collapsible
└── Touch-friendly interactions

Page: Desktop Variants (lg - 1025px)
├── All layouts at desktop size
├── Multi-column layouts
├── Full feature visibility
└── Optimal spacing

Page: Large Desktop (xl - 1281px)
├── All layouts at large width
├── Information density optimized
├── Maximum feature visibility
└── Expanded sidebars

Page: Extra Large (2xl - 1537px)
├── All layouts at 4K width
├── Full-feature display
└── Content-rich layout

Each page should include:
- Responsive breakpoint indicator
- Component sizing notes
- Spacing annotations
- Text size adjustments
- Image sizing guidelines
```

---

## FIGMA SETUP CHECKLIST

### Colors & Styles

- [ ] Create color swatches for all colors
- [ ] Organize in color groups
- [ ] Export as CSS variables
- [ ] Export as Tailwind tokens
- [ ] Verify contrast ratios

### Typography

- [ ] Create text styles for each scale
- [ ] Name consistently
- [ ] Include all weights
- [ ] Set proper line heights
- [ ] Export font information

### Components

- [ ] Create master components
- [ ] Set up variant system
- [ ] Create all state variants
- [ ] Create size variants
- [ ] Document component props

### Organization

- [ ] Name all elements consistently
- [ ] Group related components
- [ ] Create clear hierarchy
- [ ] Add helpful annotations
- [ ] Document everything

### Handoff Preparation

- [ ] Lock master components
- [ ] Hide template frames
- [ ] Create export settings
- [ ] Prepare handoff file
- [ ] Share with developers
- [ ] Document how to use

---

## DEVELOPER HANDOFF

### Export Settings

**Colors:**
```
Export as: JSON (design tokens)
Format: CSS variables
Include: All color tokens with hex values
```

**Icons:**
```
Export as: SVG
Format: Individual files per icon
Folder: /src/assets/icons/
Naming: [icon-name].svg
```

**Illustrations:**
```
Export as: SVG
Format: Individual files
Folder: /src/assets/illustrations/
Naming: [illustration-name].svg
```

**Components:**
```
Export as: Designer notes
Method: Figma Links (view mode)
Share: With development team
Access: Read-only
```

---

## MAINTENANCE

### Regular Updates

- **Weekly:** Review feedback, note issues
- **Bi-weekly:** Update tokens based on decisions
- **Monthly:** Add new components, refine existing
- **Quarterly:** Major design system refresh

### Version Control

- Figma auto-save handles version history
- Tag major releases in files
- Keep archive of major versions
- Document breaking changes

---

## TEAM COLLABORATION

### Permissions

- **Design Lead:** Full edit access
- **Developers:** View-only access
- **Product Manager:** View-only access
- **QA Team:** View-only access

### Workflow

1. Designer makes changes in main file
2. Notifies team in Slack
3. Developers review in Figma
4. Questions asked in Slack
5. Changes confirmed before export

---

**Created:** 2025-11-10
**Status:** Ready to implement in Figma
**Next Step:** Create master components following this structure
