# Component Template & Scaffolding Guide

**Template and pattern for creating new components in the design system**

---

## Component Structure

Every component should follow this structure:

```
src/components/
├── ComponentName/
│   ├── ComponentName.tsx          # Main component
│   ├── ComponentName.types.ts      # TypeScript interfaces
│   ├── ComponentName.module.css    # Component styles
│   ├── ComponentName.test.tsx      # Unit tests
│   ├── ComponentName.stories.tsx   # Storybook stories
│   └── index.ts                    # Barrel export
```

---

## File Templates

### 1. Component.tsx Template

```typescript
/**
 * ComponentName Component
 *
 * [Brief description of what the component does]
 *
 * @example
 * <ComponentName prop="value">
 *   Content
 * </ComponentName>
 */

import React from 'react';
import styles from './ComponentName.module.css';
import { ComponentNameProps } from './ComponentName.types';

export const ComponentName = React.forwardRef<
  HTMLDivElement,
  ComponentNameProps
>(
  (
    {
      // Destructure props with defaults
      variant = 'default',
      disabled = false,
      children,
      className,
      ...props
    },
    ref
  ) => {
    // Class composition
    const componentClasses = [
      styles.container,
      styles[`variant-${variant}`],
      disabled && styles.disabled,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={ref}
        className={componentClasses}
        role="region"  // Set appropriate ARIA role
        aria-label={`${name} component`}  // Accessibility
        {...props}
      >
        {/* Component content */}
        {children}
      </div>
    );
  }
);

ComponentName.displayName = 'ComponentName';
```

### 2. Component.types.ts Template

```typescript
/**
 * ComponentName Props
 */

export interface ComponentNameProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Visual variant/style
   * @default 'default'
   */
  variant?: 'default' | 'alternative';

  /**
   * Whether component is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Component content
   */
  children?: React.ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Test ID for testing
   */
  dataTestId?: string;

  /**
   * ARIA label for accessibility
   */
  ariaLabel?: string;
}
```

### 3. Component.module.css Template

```css
/**
 * ComponentName Styles
 */

/* Base Styles */
.container {
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-bg-elevated);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  transition: var(--transition-standard);
  color: var(--color-text-primary);
  font-family: var(--font-family-sans);
}

/* Variants */
.variant-default {
  /* Default variant specific styles */
}

.variant-alternative {
  /* Alternative variant specific styles */
}

/* States */
.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.container:hover:not(.disabled) {
  border-color: var(--color-accent-blue-primary);
  box-shadow: var(--shadow-md);
}

.container:focus-visible {
  outline: 2px solid var(--color-accent-blue-primary);
  outline-offset: 2px;
  box-shadow: var(--shadow-focus);
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .container {
    transition: none;
  }
}

@media (prefers-contrast: more) {
  .container {
    border-width: 2px;
  }
}
```

### 4. Component.test.tsx Template

```typescript
/**
 * ComponentName Tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders without crashing', () => {
    render(<ComponentName>Test Content</ComponentName>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies correct variant class', () => {
    const { container } = render(
      <ComponentName variant="alternative">Content</ComponentName>
    );
    expect(container.querySelector('.variant-alternative')).toBeInTheDocument();
  });

  it('disables interaction when disabled prop is true', () => {
    const { container } = render(<ComponentName disabled>Content</ComponentName>);
    expect(container.querySelector('.disabled')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ComponentName className="custom-class">Content</ComponentName>
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('supports aria-label for accessibility', () => {
    render(<ComponentName ariaLabel="Test Component">Content</ComponentName>);
    expect(screen.getByLabelText('Test Component')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    const { container } = render(
      <ComponentName onClick={handleClick}>Click Me</ComponentName>
    );
    await userEvent.click(container.firstChild as Element);
    expect(handleClick).toHaveBeenCalled();
  });

  it('accepts ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ComponentName ref={ref}>Content</ComponentName>);
    expect(ref.current).toBeInTheDocument();
  });
});
```

### 5. Component.stories.tsx Template

```typescript
/**
 * ComponentName Stories
 *
 * Storybook stories for the ComponentName component
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta = {
  title: 'Components/ComponentName',
  component: ComponentName,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['default', 'alternative'],
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story
export const Default: Story = {
  args: {
    children: 'Component Content',
  },
};

// Variant story
export const Alternative: Story = {
  args: {
    children: 'Component Content',
    variant: 'alternative',
  },
};

// Disabled story
export const Disabled: Story = {
  args: {
    children: 'Component Content',
    disabled: true,
  },
};

// Interactive story
export const Interactive: Story = {
  args: {
    children: 'Interactive Component',
  },
  render: (args) => (
    <div style={{ padding: '1rem' }}>
      <ComponentName {...args} />
    </div>
  ),
};
```

### 6. index.ts Template

```typescript
/**
 * ComponentName Barrel Export
 */

export { ComponentName } from './ComponentName';
export type { ComponentNameProps } from './ComponentName.types';
```

---

## Naming Conventions

### Files
- **Components:** PascalCase (Button, Input, Modal)
- **Utilities:** camelCase (useForm, classNames)
- **Constants:** UPPER_SNAKE_CASE (MAX_LENGTH, DEFAULT_SIZE)
- **Folders:** PascalCase matching component name

### CSS Classes
- Use BEM naming: `.ComponentName__element--modifier`
- Example: `.Button__icon--primary`
- Don't use component name prefix for internal styles

### Props
- Boolean props: `is*` or `*` (isDisabled, disabled)
- Event handlers: `on*` (onClick, onChange)
- Custom props: camelCase

---

## TypeScript Best Practices

### Props Interface
```typescript
// ✅ Good
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
}

// ❌ Avoid
type ButtonProps = any;
```

### Component Definition
```typescript
// ✅ Good - with forwardRef
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', ...props }, ref) => {
    return <button ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

// ✅ Also good - functional component
export const Button: React.FC<ButtonProps> = ({ variant = 'primary', ...props }) => {
  return <button {...props} />;
};
```

---

## CSS Best Practices

### Use Design Tokens
```css
/* ✅ Good */
.button {
  background-color: var(--color-accent-blue-primary);
  padding: var(--spacing-lg);
  border-radius: var(--radius-md);
  transition: var(--transition-standard);
}

/* ❌ Avoid hardcoded values */
.button {
  background-color: #00d9ff;
  padding: 16px;
  border-radius: 8px;
  transition: all 200ms ease-out;
}
```

### Media Queries
```css
/* Mobile-first approach */
.container {
  /* Mobile styles */
  display: flex;
  flex-direction: column;
}

@media (min-width: var(--breakpoint-md)) {
  .container {
    /* Tablet and up */
    flex-direction: row;
  }
}

@media (min-width: var(--breakpoint-lg)) {
  .container {
    /* Desktop and up */
  }
}
```

### Accessibility
```css
/* Focus states */
.button:focus-visible {
  outline: 2px solid var(--color-accent-blue-primary);
  outline-offset: 2px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}

/* High contrast */
@media (prefers-contrast: more) {
  .button {
    border-width: 2px;
  }
}
```

---

## Component Development Checklist

### Implementation
- [ ] Create all 6 files (tsx, types, css, test, stories, index)
- [ ] Use React.forwardRef for components with refs
- [ ] Implement all props from specification
- [ ] Add proper TypeScript types
- [ ] Use CSS modules for styling
- [ ] Implement all states (default, hover, active, disabled, focus)
- [ ] Use design tokens for all values

### Accessibility
- [ ] Add proper ARIA roles/labels
- [ ] Test keyboard navigation
- [ ] Verify focus indicators visible
- [ ] Test with screen reader
- [ ] Ensure color contrast 4.5:1
- [ ] Support reduced motion preference
- [ ] Support high contrast mode

### Testing
- [ ] Unit tests (80%+ coverage)
- [ ] Test all props combinations
- [ ] Test all states
- [ ] Test event handlers
- [ ] Test ref forwarding
- [ ] Test accessibility

### Documentation
- [ ] JSDoc comments on component
- [ ] Props documented with types
- [ ] Examples in component comments
- [ ] Storybook stories created
- [ ] Stories for all variants
- [ ] Stories for all states

### Code Quality
- [ ] ESLint passes
- [ ] Prettier formatted
- [ ] TypeScript strict mode passes
- [ ] No console errors/warnings
- [ ] Follows naming conventions
- [ ] Component re-exported in index.ts

---

## Component Checklist for All 45+ Components

### Phase 1: Buttons (Days 1-2)
- [ ] Button (Primary, Secondary, Tertiary, Icon)
- [ ] All sizes (Small, Medium, Large, Extra-Large)
- [ ] All states (Default, Hover, Active, Disabled, Focus)

### Phase 2: Form Inputs (Days 3-5)
- [ ] Text Input
- [ ] Text Area
- [ ] Checkbox
- [ ] Radio Button
- [ ] Toggle Switch
- [ ] Select/Dropdown
- [ ] Search Input
- [ ] Date/Time Input

### Phase 3: Containers (Days 6-8)
- [ ] Card
- [ ] Metric Card
- [ ] Alert Card
- [ ] Modal
- [ ] Toast Notification
- [ ] Panel

### Phase 4: Data Display (Days 9-11)
- [ ] Table
- [ ] List Item
- [ ] Badge
- [ ] Pagination
- [ ] Status Indicator

### Phase 5: Navigation (Days 12-14)
- [ ] Top Navigation Bar
- [ ] Sidebar Navigation
- [ ] Tabs
- [ ] Breadcrumb
- [ ] Icon Buttons (all 45+ icons)

### Phase 6: Feedback (Days 15-17)
- [ ] Spinner/Loading
- [ ] Progress Bar
- [ ] Skeleton Screen
- [ ] Popover
- [ ] Avatar

---

## Quick Start Commands

```bash
# Create component folder
mkdir -p src/components/ComponentName

# Create all files from templates
# Copy templates above and customize

# Run tests
npm run test -- ComponentName

# Run linter
npm run lint -- src/components/ComponentName

# View in Storybook
npm run storybook
# Navigate to Components/ComponentName
```

---

## Common Patterns

### Conditional Rendering
```typescript
{condition && <Element />}
{children}
```

### Class Composition
```typescript
const classes = [
  styles.base,
  variant && styles[`variant-${variant}`],
  disabled && styles.disabled,
  className,
]
  .filter(Boolean)
  .join(' ');
```

### Event Handling
```typescript
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  if (!disabled && onClick) {
    onClick(e);
  }
};
```

### Accessibility
```typescript
<button
  aria-label={ariaLabel}
  aria-disabled={disabled}
  aria-busy={loading}
  role="button"
  type="button"
/>
```

---

**Created:** 2025-11-10
**Status:** Ready for use in component development
