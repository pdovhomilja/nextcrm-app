# Component Specifications

**Complete specifications for all 45+ components in the design system**

---

## BUTTONS

### Primary Button

**Purpose:** Primary call-to-action, main actions

**States:**
- Default: Electric blue background (#00d9ff), dark text
- Hover: Darker cyan (#00b8d4), shadow elevation increases
- Active: Even darker (#0099b3), slightly scaled down
- Disabled: Gray background, opacity 0.5, no pointer
- Focus: 3px cyan focus ring

**Sizes:**
- Small: 28px height, 12px padding, Body Small font
- Medium: 36px height, 16px padding, Body Medium font (default)
- Large: 44px height, 20px padding, Body Large font
- Extra-Large: 52px height, 24px padding, Body Large bold

**Props:**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'small' | 'medium' | 'large' | 'extraLarge';
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}
```

### Secondary Button

**Purpose:** Alternative actions, lower priority

**States:**
- Default: Gray background (#21262d), light text, 1px border
- Hover: Darker background (#30363d), border lighter
- Active: Even darker background, reduced shadow
- Disabled: Original gray, opacity reduced
- Focus: Focus ring visible

**Sizes:** Same as Primary Button

### Tertiary Button

**Purpose:** Minimal style, text-only action

**States:**
- Default: Transparent background, cyan text
- Hover: Light cyan background (10% opacity)
- Active: 15% opacity background
- Disabled: Gray text, opacity reduced
- Focus: Focus ring visible

### Icon Button

**Purpose:** Icon-only button for compact UI

**Specifications:**
- Base size: 36px × 36px
- Icon size: 20px × 20px (centered)
- Border: 1px subtle border
- Background: Transparent, becomes light on hover
- No text label (use aria-label)

---

## FORM INPUTS

### Text Input

**Purpose:** Basic text entry

**States:**
- Default: Light gray border, dark background
- Hover: Border slightly darker
- Focus: Cyan border (2px), focus ring
- Filled: Shows entered text
- Disabled: Gray border, opacity 0.5
- Error: Red border (2px), red focus ring
- Success: Green border (2px)
- Loading: Spinner on right side

**Features:**
- 36px height (standard)
- 12px horizontal padding
- Placeholder text in gray
- Optional label above
- Optional helper text below
- Optional error message

**Props:**
```typescript
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean | string;
  success?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  label?: string;
  helperText?: string;
  required?: boolean;
  maxLength?: number;
  className?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}
```

### Text Area

**Purpose:** Multi-line text entry

**Specifications:**
- Minimum height: 80px
- Maximum height: 300px (scrollable)
- 12px padding all around
- Resizable (vertical only)
- Supports all input states
- Line numbers optional
- Character counter optional

### Select/Dropdown

**Purpose:** Choose from predefined options

**States:**
- Closed default: Shows selected value
- Closed hover: Border highlight
- Open: Dropdown appears below, options list
- Option hover: Light highlight
- Option selected: Checked indicator, bold text
- Disabled: Gray, no interaction

**Features:**
- Dropdown panel has own z-index
- Maximum height 200px (scrollable)
- Search optional (type to filter)
- Multiple selection possible
- Grouped options support

### Checkbox

**Purpose:** Toggle single option, multi-select

**Specifications:**
- Size: 20px × 20px
- Border: 2px
- Checked: Cyan background, white checkmark
- Unchecked: Transparent, gray border
- Indeterminate: Cyan background, white minus
- Disabled: Gray, opacity 0.5
- Associated label for better UX

### Radio Button

**Purpose:** Single selection from group

**Specifications:**
- Size: 20px × 20px (diameter)
- Border: 2px
- Selected: Cyan border, cyan interior circle (8px)
- Unselected: Gray border, transparent interior
- Disabled: Gray, opacity 0.5
- Must be used in group with name attribute

### Toggle Switch

**Purpose:** Binary on/off toggle

**Specifications:**
- Size: 48px × 24px
- Off: Gray background, white thumb left
- On: Cyan background, white thumb right
- Thumb size: 20px × 20px
- Animation: Smooth 200ms transition
- Disabled: Opacity 0.5
- Associated label for accessibility

---

## CARDS & CONTAINERS

### Standard Card

**Purpose:** Content container with elevation

**Structure:**
- Optional header (with title, optional badge)
- Content area (flexible)
- Optional footer (meta info, actions)
- All sections with dividers

**Specifications:**
- Background: #161b22
- Border: 1px #30363d
- Border radius: 8px
- Padding: 24px
- Shadow: Depth 1
- Hover: Border cyan, shadow increases

**Props:**
```typescript
interface CardProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  interactive?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}
```

### Metric Card

**Purpose:** Display key metric with value

**Specifications:**
- Size: 240px × 160px (flexible)
- Label: Gray text, uppercase, 12px
- Value: Large text (40px), bold, cyan colored
- Unit: Smaller text (12px), gray
- Optional trend indicator: Up/down arrow with percentage
- Optional mini chart: Sparkline with trend
- Status colors: Success (green), warning (amber), error (red)

### Alert Card

**Purpose:** Important notification

**Variants:**
- Success: Green border, success icon, message
- Warning: Amber border, warning icon, message
- Error: Red border, error icon, message
- Info: Blue border, info icon, message

**Features:**
- Optional title
- Message text
- Optional action button
- Close button (×)
- Auto-dismiss optional

---

## NAVIGATION COMPONENTS

### Top Navigation Bar

**Purpose:** Primary navigation, global controls

**Structure:**
- Left: Logo and app name (clickable to home)
- Center: Search bar (optional)
- Right: User menu, settings, notifications

**Specifications:**
- Fixed position, sticky to top
- Height: 56px (48px on mobile)
- Background: Dark primary
- Z-index: 100
- Border bottom: 1px divider

**Features:**
- Logo icon 32px × 32px
- Search bar 300px width (hidden on mobile)
- User avatar 32px × 32px
- Notification badge indicator
- Theme toggle button
- Help/info button

### Sidebar Navigation

**Purpose:** Primary feature navigation

**States:**
- Expanded: 240px width, full labels visible
- Collapsed: 64px width, icon-only, tooltip on hover

**Structure:**
- App logo top
- Navigation sections with labels
- Navigation items with icons and labels
- Items indicate active state (left border, highlight)
- Badges for notifications
- Collapse/expand button bottom

**Navigation Item States:**
- Inactive: Gray text, gray icon
- Hover: Light background, brighter text
- Active: Cyan left border, cyan text, bold
- Badge: Red notification dot

### Tabs

**Purpose:** Switch between related content

**Structure:**
- Tab buttons in horizontal row
- Underline indicator for active tab
- Content panel below switches on click

**Specifications:**
- Height: 44px
- Tab padding: 12px horizontal, 8px vertical
- Underline: 3px cyan, smooth transition
- Inactive: Gray text
- Active: Cyan text and underline
- Optional icons per tab
- Optional badges per tab

---

## DATA DISPLAY

### Table

**Purpose:** Display structured data

**Structure:**
- Sticky header row
- Data rows
- Footer with pagination
- Columns sortable by clicking header

**Header Row:**
- 44px height
- 12px padding
- Label uppercase
- Sort indicator arrow
- Resizable columns (drag edge)

**Body Rows:**
- 44px height
- Alternating subtle background (optional)
- Hover: Light cyan background
- Selected: Darker cyan background, left border

**Cell Types:**
- Text: Standard text display
- Code: Monospace, light background
- Status: Colored badge
- Numeric: Right-aligned
- Action: Icon buttons (edit, delete, view)

**Pagination Footer:**
- Prev/Next buttons
- Page indicator
- Rows per page selector
- Result count

### List Item

**Purpose:** Display single item in list

**Specifications:**
- Height: 40px minimum
- Padding: 12px vertical, 16px horizontal
- Icon (optional): Left side, 20px
- Title: Bold text
- Subtitle (optional): Gray text
- Trailing icon/action (optional): Right side
- States: Hover highlight, selected highlight

### Badge

**Purpose:** Label or tag display

**Variants:**
- Default: Gray background
- Success: Green background
- Warning: Amber background
- Error: Red background
- Info: Blue background

**Features:**
- Padding: 4px 8px
- Border radius: 4px
- Font: Label Medium (12px, semibold)
- Outline option (transparent background, colored border)
- Icon optional (left or right)
- Closeable variant (× button)

---

## FEEDBACK & OVERLAYS

### Modal

**Purpose:** Important user interaction, focused content

**Structure:**
- Overlay backdrop (50% black)
- Modal box centered
- Header with title and close button (×)
- Body with content
- Footer with buttons (OK, Cancel, etc.)

**Specifications:**
- Min width: 320px
- Max width: 600px
- Body max height: calc(90vh - 180px) scrollable
- Border radius: 12px
- Shadow: Depth 4
- Animation: Scale + fade in 200ms

**Focus Management:**
- Focus trap inside modal
- Focus returns to trigger on close
- Escape key closes

### Toast/Alert Notification

**Purpose:** Temporary notification

**Variants:** Success, Error, Warning, Info

**Specifications:**
- Max width: 400px
- Min height: 56px
- Position: Fixed (top-right default)
- Auto-dismiss: 5 seconds (configurable)
- Icon: Status-colored
- Message: Clear, actionable
- Close button: Optional
- Action button: Optional

**Animation:**
- Entrance: Slide down + fade, 200ms
- Exit: Slide up + fade, 200ms

### Loading States

**Spinner:**
- 24px × 24px
- Rotation animation 1s linear infinite
- Color: Info blue

**Progress Bar:**
- Height: 4px
- Background: Subtle gray
- Progress: Cyan color
- Animation: Smooth ease-in

**Skeleton Screen:**
- Shimmer animation 1s infinite
- Background: Subtle gray
- Matches expected content shape

---

## ICON BUTTON REFERENCE

### Required Icons (45+)

**Navigation (8):**
- Dashboard, Schema, Query, Tenant, Code, Performance, Migrate, Security

**Common (20+):**
- Search, Menu, Close, Settings, Notifications, User, LogOut, Help
- Check, Error, Warning, Loading, Copy, Download, Upload, Edit, Delete
- View, Hide, More, Filter, Sort, Refresh

**Directional (6):**
- ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ArrowUp, ArrowDown

**Data (8):**
- BarChart, LineChart, PieChart, Table, Database, Server, Cloud, Network

**Status (6):**
- CheckCircle, AlertCircle, XCircle, InfoCircle, Clock, Pulse

---

## ACCESSIBILITY REQUIREMENTS

### All Components Must Have:

1. **Keyboard Support**
   - Tab to focus
   - Enter/Space to activate
   - Arrow keys for navigation (where applicable)

2. **ARIA Labels**
   - aria-label for icon-only elements
   - aria-describedby for related text
   - aria-expanded for toggles
   - aria-selected for lists
   - aria-current for active items

3. **Focus Indicators**
   - Visible on all interactive elements
   - 3px cyan ring or outline
   - 2:1 contrast minimum

4. **Semantic HTML**
   - Use proper elements (button, a, form, input)
   - Don't use div for semantic roles
   - Proper heading hierarchy

5. **Form Accessibility**
   - Labels associated with inputs
   - Error messages linked
   - Required fields marked

---

## Component Props Template

Every component should have:

```typescript
interface ComponentProps {
  // Style
  className?: string;
  style?: React.CSSProperties;

  // State
  disabled?: boolean;
  loading?: boolean;

  // Content
  children?: React.ReactNode;
  icon?: React.ReactNode;

  // Handlers
  onClick?: (e: React.MouseEvent) => void;
  onChange?: (e: any) => void;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;

  // Accessibility
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaLabelledBy?: string;
  role?: string;
  title?: string;

  // Data attributes (for testing)
  dataTestId?: string;
}
```

---

**Last Updated:** 2025-11-10
**Total Components:** 45+
**Status:** ✅ Complete specifications ready for implementation
