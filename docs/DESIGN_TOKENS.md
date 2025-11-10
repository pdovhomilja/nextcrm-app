# Design Tokens Reference

**Complete reference for all design tokens used in the Prisma Design System**

---

## COLOR TOKENS

### Background Colors (Dark Mode)

```
--color-bg-primary: #0f1117
  RGB: rgb(15, 17, 23)
  Use: Main canvas background
  Contrast: Primary text on this = 13.9:1 ✓

--color-bg-secondary: #161b22
  RGB: rgb(22, 27, 34)
  Use: Cards, panels, containers
  Contrast: Primary text on this = 5.4:1 ✓

--color-bg-tertiary: #21262d
  RGB: rgb(33, 38, 45)
  Use: Subtle elevation, disabled states
  Contrast: Primary text on this = 3.8:1 ✓

--color-bg-elevated: #30363d
  RGB: rgb(48, 54, 61)
  Use: Modals, popovers, overlays
  Contrast: Primary text on this = 2.5:1
```

### Text Colors (Dark Mode)

```
--color-text-primary: #e6edf3
  RGB: rgb(230, 237, 243)
  Use: Main text, headings, primary content
  Accessibility: Maximum contrast

--color-text-secondary: #8b949e
  RGB: rgb(139, 148, 158)
  Use: Labels, secondary text, captions
  Accessibility: 5.4:1 ratio

--color-text-tertiary: #6e7681
  RGB: rgb(110, 118, 129)
  Use: Disabled text, hints, very secondary
  Accessibility: 3.8:1 ratio (use for non-essential)

--color-text-inverse: #0f1117
  RGB: rgb(15, 17, 23)
  Use: Text on light backgrounds (accents)
  Accessibility: Maximum contrast
```

### Accent Colors

```
--color-accent-blue-primary: #00d9ff
  RGB: rgb(0, 217, 255)
  Use: Primary CTAs, links, focus states
  Accessibility: 4.8:1 on dark bg ✓

--color-accent-blue-deep: #0969da
  RGB: rgb(9, 105, 218)
  Use: Alternative primary, visited links
  Accessibility: 5.2:1 on dark bg ✓

--color-accent-blue-bright: #1f6feb
  RGB: rgb(31, 110, 251)
  Use: Hover states, active states
  Accessibility: 4.9:1 on dark bg ✓
```

### Status Colors

```
--color-status-success: #10b981
  RGB: rgb(16, 185, 129)
  Use: Successful operations, active states
  Accessibility: 4.1:1 on dark bg ✓

--color-status-warning: #f59e0b
  RGB: rgb(245, 158, 11)
  Use: Warnings, optimization needed, caution
  Accessibility: 2.1:1 on dark bg (use with bg)

--color-status-error: #ef4444
  RGB: rgb(239, 68, 68)
  Use: Errors, failures, danger
  Accessibility: 2.9:1 on dark bg (use with bg)

--color-status-info: #3b82f6
  RGB: rgb(59, 130, 246)
  Use: Information, live indicators, notes
  Accessibility: 5.1:1 on dark bg ✓
```

### Chart/Data Colors

```
--color-chart-series-1: #00d9ff (Cyan)
--color-chart-series-2: #10b981 (Emerald)
--color-chart-series-3: #f59e0b (Amber)
--color-chart-series-4: #3b82f6 (Blue)
--color-chart-series-5: #8b5cf6 (Violet)
--color-chart-series-6: #ec4899 (Pink)

Use: Multi-series charts, distinguishable colors
Accessibility: All distinguishable in colorblind mode
```

### Neutral Colors

```
--color-neutral-50: #f9fafb
--color-neutral-100: #f3f4f6
--color-neutral-200: #e5e7eb
--color-neutral-300: #d1d5db
--color-neutral-400: #9ca3af
--color-neutral-500: #6b7280
--color-neutral-600: #4b5563
--color-neutral-700: #374151
--color-neutral-800: #1f2937
--color-neutral-900: #111827

Use: General purpose neutral colors for extended palette
```

---

## TYPOGRAPHY TOKENS

### Font Families

```
--font-family-sans: -apple-system, BlinkMacSystemFont, "Segoe UI",
                    "Helvetica Neue", Arial, sans-serif
  Use: All UI text, primary font

--font-family-mono: "Courier New", Courier, monospace
  Fallbacks: Monaco, Menlo, "Ubuntu Mono"
  Use: Code, technical content, monospaced text
```

### Font Sizes

```
--font-size-xs: 12px (0.75rem)
--font-size-sm: 14px (0.875rem)
--font-size-base: 16px (1rem)
--font-size-lg: 20px (1.25rem)
--font-size-xl: 24px (1.5rem)
--font-size-2xl: 32px (2rem)
--font-size-3xl: 40px (2.5rem)
--font-size-4xl: 48px (3rem)
```

### Font Weights

```
--font-weight-normal: 400
--font-weight-medium: 500
--font-weight-semibold: 600
--font-weight-bold: 700
--font-weight-extra-bold: 800
```

### Line Heights

```
--line-height-tight: 1.2
--line-height-normal: 1.4
--line-height-relaxed: 1.5
--line-height-loose: 1.75
```

### Letter Spacing

```
--letter-spacing-tight: -0.5px
--letter-spacing-normal: 0px
--letter-spacing-wide: 0.5px
--letter-spacing-extra-wide: 1px
```

---

## SPACING TOKENS

### Base Spacing Scale (8px unit)

```
--spacing-0: 0px
--spacing-xs: 4px (0.5 unit)
--spacing-sm: 8px (1 unit)
--spacing-md: 12px (1.5 units)
--spacing-lg: 16px (2 units)
--spacing-xl: 24px (3 units)
--spacing-xxl: 32px (4 units)
--spacing-3xl: 48px (6 units)
--spacing-4xl: 64px (8 units)
--spacing-5xl: 80px (10 units)
--spacing-6xl: 96px (12 units)
```

### Component Padding

```
--component-padding-button: 8px 16px (vertical horizontal)
--component-padding-input: 8px 12px
--component-padding-card: 24px
--component-padding-modal: 32px
--component-padding-list-item: 12px 16px

Note: Padding is often asymmetric for visual balance
```

### Component Gaps

```
--component-gap-button-group: 12px
--component-gap-form-row: 16px
--component-gap-card-grid: 16px
--component-gap-section: 32px
--component-gap-feature: 48px
```

---

## SHADOW TOKENS

### Elevation Shadows

```
--shadow-sm:
  0 1px 3px rgba(0, 0, 0, 0.12),
  0 1px 2px rgba(0, 0, 0, 0.24)
  Use: Subtle elevation, inputs, buttons

--shadow-md:
  0 3px 6px rgba(0, 0, 0, 0.16),
  0 3px 6px rgba(0, 0, 0, 0.23)
  Use: Medium elevation, cards, panels

--shadow-lg:
  0 10px 20px rgba(0, 0, 0, 0.19),
  0 6px 6px rgba(0, 0, 0, 0.23)
  Use: High elevation, modals, popovers

--shadow-xl:
  0 15px 25px rgba(0, 0, 0, 0.15),
  0 5px 10px rgba(0, 0, 0, 0.05)
  Use: Maximum elevation, full-screen overlays
```

### Focus Shadow

```
--shadow-focus:
  0 0 0 3px rgba(0, 217, 255, 0.25)
  Use: Keyboard focus indicator rings
  Color: Cyan with 25% opacity for visibility
```

### Inset Shadow

```
--shadow-inset: inset 0 1px 2px rgba(0, 0, 0, 0.25)
  Use: Pressed/indented effects
```

---

## BORDER TOKENS

### Border Radius

```
--radius-none: 0px
--radius-xs: 2px
--radius-sm: 4px (inputs, small elements)
--radius-md: 8px (buttons, cards, standard)
--radius-lg: 12px (panels, larger containers)
--radius-xl: 16px (major components)
--radius-full: 9999px (pills, rounded shapes)
```

### Border Width

```
--border-hairline: 0.5px (very subtle dividers)
--border-thin: 1px (standard, default)
--border-medium: 2px (active states, emphasis)
--border-thick: 3px (strong emphasis)
```

### Border Colors

```
--border-primary: #30363d
  Use: Main borders, dividers

--border-secondary: #21262d
  Use: Subtle borders, secondary dividers

--border-accent: #00d9ff
  Use: Active, focused, highlighted borders

--border-danger: #ef4444
  Use: Error states, warning borders

--border-success: #10b981
  Use: Success states, confirmation
```

---

## ANIMATION TOKENS

### Timing Functions

```
--ease-in: cubic-bezier(0.4, 0, 1, 1)
  Use: Entering animations, emphasis
  Characteristic: Slow start, fast end

--ease-out: cubic-bezier(0, 0, 0.2, 1)
  Use: Exiting animations, natural feel
  Characteristic: Fast start, slow end

--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
  Use: Complex animations, smooth transitions
  Characteristic: Slow on both ends

--ease-linear: linear
  Use: Progress bars, continuous motion
  Characteristic: Constant speed throughout
```

### Durations

```
--duration-instant: 0ms
  Use: Immediate feedback

--duration-fast: 100ms
  Use: Hover states, quick feedback

--duration-standard: 200ms
  Use: UI state changes, modal animations

--duration-slow: 300ms
  Use: Page transitions, complex animations

--duration-extra-slow: 500ms
  Use: Entrance animations, major transitions
```

### Transition Presets

```
--transition-fast: all 100ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-standard: all 200ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-slow: all 300ms cubic-bezier(0.4, 0, 0.2, 1)
```

---

## RESPONSIVE TOKENS

### Breakpoints

```
--breakpoint-xs: 0px (Mobile)
--breakpoint-sm: 641px (Mobile landscape)
--breakpoint-md: 769px (Tablet)
--breakpoint-lg: 1025px (Desktop)
--breakpoint-xl: 1281px (Large desktop)
--breakpoint-2xl: 1537px (Extra large)

CSS Media Queries:
@media (min-width: 769px) { ... } /* md and up */
@media (max-width: 768px) { ... } /* md and down */
```

### Container Widths

```
--container-sm: 640px
--container-md: 768px
--container-lg: 1024px
--container-xl: 1280px
--container-2xl: 1536px
```

---

## Z-INDEX TOKENS

```
--z-dropdown: 1000
  Use: Dropdowns, context menus

--z-sticky: 50
  Use: Sticky headers, sticky sidebar

--z-fixed: 100
  Use: Fixed top navigation

--z-modal-overlay: 200
  Use: Modal overlay backdrop

--z-modal: 201
  Use: Modal content above overlay

--z-popover: 1000
  Use: Popovers, tooltips

--z-notification: 1050
  Use: Toast notifications, alerts
```

---

## CSS VARIABLES IMPLEMENTATION

### Global CSS File

```css
/* colors.css */
:root {
  /* Background */
  --color-bg-primary: #0f1117;
  --color-bg-secondary: #161b22;
  --color-bg-tertiary: #21262d;
  --color-bg-elevated: #30363d;

  /* Text */
  --color-text-primary: #e6edf3;
  --color-text-secondary: #8b949e;
  --color-text-tertiary: #6e7681;
  --color-text-inverse: #0f1117;

  /* Accents */
  --color-accent-blue-primary: #00d9ff;
  --color-accent-blue-deep: #0969da;
  --color-accent-blue-bright: #1f6feb;

  /* Status */
  --color-status-success: #10b981;
  --color-status-warning: #f59e0b;
  --color-status-error: #ef4444;
  --color-status-info: #3b82f6;

  /* Typography */
  --font-family-sans: -apple-system, BlinkMacSystemFont, "Segoe UI",
                      "Helvetica Neue", Arial, sans-serif;
  --font-family-mono: "Courier New", Courier, monospace;

  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 20px;
  --font-size-xl: 24px;
  --font-size-2xl: 32px;
  --font-size-3xl: 40px;
  --font-size-4xl: 48px;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-xxl: 32px;
  --spacing-3xl: 48px;
  --spacing-4xl: 64px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  --shadow-md: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);
  --shadow-lg: 0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23);
  --shadow-xl: 0 15px 25px rgba(0, 0, 0, 0.15), 0 5px 10px rgba(0, 0, 0, 0.05);
  --shadow-focus: 0 0 0 3px rgba(0, 217, 255, 0.25);

  /* Borders */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Animations */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

  --duration-fast: 100ms;
  --duration-standard: 200ms;
  --duration-slow: 300ms;

  --transition-fast: all 100ms var(--ease-in-out);
  --transition-standard: all 200ms var(--ease-in-out);
}
```

---

## Tailwind Configuration Example

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        background: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
          elevated: 'var(--color-bg-elevated)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
        },
        accent: {
          blue: 'var(--color-accent-blue-primary)',
          deepblue: 'var(--color-accent-blue-deep)',
        },
        status: {
          success: 'var(--color-status-success)',
          warning: 'var(--color-status-warning)',
          error: 'var(--color-status-error)',
          info: 'var(--color-status-info)',
        },
      },
      spacing: {
        xs: 'var(--spacing-xs)',
        sm: 'var(--spacing-sm)',
        md: 'var(--spacing-md)',
        lg: 'var(--spacing-lg)',
        xl: 'var(--spacing-xl)',
        xxl: 'var(--spacing-xxl)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
    },
  },
};
```

---

## Usage Examples

### In CSS

```css
.button {
  background-color: var(--color-accent-blue-primary);
  color: var(--color-text-inverse);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: var(--transition-fast);
}

.button:hover {
  background-color: var(--color-accent-blue-bright);
  box-shadow: var(--shadow-md);
}

.button:focus {
  box-shadow: var(--shadow-focus);
}
```

### In React/TSX

```tsx
const Button = ({ children, variant = 'primary' }) => {
  const styles = {
    background: 'var(--color-accent-blue-primary)',
    color: 'var(--color-text-inverse)',
    padding: 'var(--spacing-sm) var(--spacing-lg)',
    borderRadius: 'var(--radius-md)',
    transition: 'var(--transition-fast)',
  };

  return <button style={styles}>{children}</button>;
};
```

---

**Last Updated:** 2025-11-10
**Status:** ✅ Complete and ready for implementation
