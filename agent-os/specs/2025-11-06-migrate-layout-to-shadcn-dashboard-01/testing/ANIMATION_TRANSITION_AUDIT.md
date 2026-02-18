# Animation & Transition Standardization Audit - Task Group 5.3
## Layout Migration to shadcn dashboard-01

**Date**: 2025-11-06
**Phase**: 5 (Design Consistency)
**Task Group**: 5.3 - Animation & Transition Standardization

---

## Executive Summary

This audit identifies all custom animation and transition classes in the NextCRM application, specifically custom `duration-*` classes that should be replaced with shadcn default transitions. The goal is to ensure consistent, smooth animations across all components that match the shadcn dashboard-01 design system.

---

## Audit Methodology

### Search Criteria
1. Searched for `duration-` class usage across codebase
2. Located files in `/app` and `/components` directories
3. Identified shadcn default animation patterns
4. Categorized custom animations by component type

### Animation Philosophy
**shadcn/ui Default Approach:**
- Uses Tailwind's built-in animation utilities
- Relies on `data-[state]` attributes for state-based animations
- Uses `transition-*` utilities with sensible defaults
- Minimizes custom duration classes

---

## Identified Custom Duration Classes

### 1. `/app/[locale]/(routes)/components/nav-main.tsx`
**Location**: ChevronRight icon rotation
**Current Implementation:**
```tsx
<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
```

**Analysis:**
- Custom `duration-200` class
- Used for collapsible navigation expansion icon
- Controls rotation animation speed

**Recommendation:**
- **KEEP** - `duration-200` is a reasonable default for interactive elements
- Alternative: Use `transition-transform` without explicit duration (Tailwind default is 150ms)
- Decision: Remove `duration-200` to use Tailwind default, or document as intentional

**Priority**: Medium
**Impact**: Low (subtle timing difference)

---

### 2. `/app/[locale]/(routes)/components/app-sidebar.tsx`
**Location**: Logo "N" symbol and text

#### 2a. "N" Symbol Border Animation
**Current Implementation:**
```tsx
className="cursor-pointer border rounded-full px-4 py-2 transition-transform duration-500"
```

**Analysis:**
- Custom `duration-500` class (slower animation)
- Used for "N" symbol rotation on sidebar toggle
- Intentionally slow for visual effect

**Recommendation:**
- **REVIEW** - `duration-500` is notably slower than standard (150-300ms)
- This appears intentional for emphasis on brand element
- Decision: Keep if intentional brand animation, or reduce to `duration-300` for consistency

**Priority**: Medium
**Impact**: Medium (noticeable animation speed)

#### 2b. App Name Text Animation
**Current Implementation:**
```tsx
className="origin-left font-medium text-xl transition-transform duration-200"
```

**Analysis:**
- Custom `duration-200` class
- Used for app name reveal/hide animation
- Matches common interaction timing

**Recommendation:**
- **STANDARDIZE** - Use Tailwind default or consistent timing
- Remove `duration-200` to use default `duration-150`
- Or document as standard interaction duration

**Priority**: Medium
**Impact**: Low (subtle timing difference)

---

### 3. `/app/[locale]/(routes)/components/ModuleMenu.tsx` (LEGACY)
**Status**: This component should be deprecated/removed after migration

#### 3a. Sidebar Container Animation
**Current Implementation:**
```tsx
className="h-screen p-5 pt-8 relative duration-300"
```

**Analysis:**
- Custom `duration-300` class on sidebar container
- Used for sidebar width transition
- **NOTE**: This file should be removed as part of layout migration

**Recommendation:**
- **REMOVE FILE** - ModuleMenu.tsx is replaced by app-sidebar.tsx
- No update needed, file should be deleted in cleanup

**Priority**: Low (file should be removed)
**Impact**: None (legacy code)

#### 3b. Toggle Button Animation
**Current Implementation:**
```tsx
className="cursor-pointer duration-500 border rounded-full px-4 py-2"
```

**Analysis:**
- Custom `duration-500` class on toggle button
- Legacy implementation

**Recommendation:**
- **REMOVE FILE** - Part of legacy component

**Priority**: Low (file should be removed)
**Impact**: None (legacy code)

#### 3c. Logo Text Animation
**Current Implementation:**
```tsx
className="origin-left font-medium text-xl duration-200"
```

**Analysis:**
- Custom `duration-200` class
- Legacy implementation

**Recommendation:**
- **REMOVE FILE** - Part of legacy component

**Priority**: Low (file should be removed)
**Impact**: None (legacy code)

---

### 4. `/components/ui/dialog.tsx`
**Location**: DialogContent animation
**Current Implementation:**
```tsx
className="... duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out ..."
```

**Analysis:**
- Custom `duration-200` class on Dialog animation
- This is the **base shadcn/ui Dialog component**
- Affects all Dialog instances in application

**Recommendation:**
- **VERIFY** - Check if this is original shadcn pattern or custom modification
- If custom: Remove to use shadcn default
- If original: Document as standard Dialog animation timing

**Priority**: High (affects all Dialogs)
**Impact**: Medium (all Dialog animations)

**Action Required:**
1. Check original shadcn/ui dialog.tsx from official source
2. If `duration-200` is original shadcn, keep and document
3. If custom addition, remove for consistency

---

### 5. `/components/ui/dialog-document-view.tsx`
**Location**: DialogContent animation
**Current Implementation:**
```tsx
className="... duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out ..."
```

**Analysis:**
- Same pattern as base dialog.tsx
- Custom variant for document viewing
- Consistent with base Dialog timing

**Recommendation:**
- **MATCH BASE** - Should use same timing as base dialog.tsx
- If base dialog keeps `duration-200`, this should too
- If base dialog removes it, this should too

**Priority**: High (consistency with base)
**Impact**: Medium (document Dialog animations)

---

### 6. `/components/ui/sidebar.tsx`
**Location**: Multiple sidebar animations

#### 6a. Sidebar Width Transition
**Current Implementation:**
```tsx
className="relative w-[--sidebar-width] bg-transparent transition-[width] duration-200 ease-linear"
```

**Analysis:**
- Custom `duration-200` with `ease-linear`
- Official shadcn sidebar component animation
- Controls sidebar expand/collapse width animation

**Recommendation:**
- **KEEP** - This is original shadcn sidebar pattern
- Part of official shadcn/ui sidebar component
- Well-tested and performant

**Priority**: Low (official shadcn)
**Impact**: None (correct implementation)

#### 6b. Sidebar Position Transition
**Current Implementation:**
```tsx
className="fixed inset-y-0 z-10 hidden h-svh w-[--sidebar-width] transition-[left,right,width] duration-200 ease-linear md:flex"
```

**Analysis:**
- Same pattern as 6a
- Controls sidebar position animation for mobile
- Official shadcn pattern

**Recommendation:**
- **KEEP** - Original shadcn sidebar pattern

**Priority**: Low (official shadcn)
**Impact**: None (correct implementation)

#### 6c. Sidebar Group Label Transition
**Current Implementation:**
```tsx
className="flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0"
```

**Analysis:**
- `transition-[margin,opacity] duration-200 ease-linear`
- Controls sidebar group label fade/margin animation
- Official shadcn pattern

**Recommendation:**
- **KEEP** - Original shadcn sidebar pattern

**Priority**: Low (official shadcn)
**Impact**: None (correct implementation)

---

## shadcn Default Animation Patterns

### Standard Transition Durations (Tailwind)
- **duration-75**: 75ms - Very fast (hover effects)
- **duration-100**: 100ms - Fast (hover effects)
- **duration-150**: 150ms - Default (most interactions)
- **duration-200**: 200ms - Slightly slower (dialogs, dropdowns)
- **duration-300**: 300ms - Medium (layout changes)
- **duration-500**: 500ms - Slow (emphasis animations)

### shadcn/ui Component Defaults
Based on audit findings:
- **Dialogs**: `duration-200` (verified from dialog.tsx)
- **Sidebars**: `duration-200 ease-linear` (verified from sidebar.tsx)
- **Dropdowns**: Uses Tailwind defaults (typically duration-150)
- **Sheets**: Uses data-[state] animations (similar to Dialogs)

### Data-State Animations
shadcn components use Radix UI's data-[state] attributes:
```tsx
data-[state=open]:animate-in
data-[state=closed]:animate-out
data-[state=closed]:fade-out-0
data-[state=open]:fade-in-0
```

These are preferred over custom animation classes.

---

## Implementation Plan

### Phase 1: Verify Base Components (Priority: High)
**Files:**
- `/components/ui/dialog.tsx`
- `/components/ui/dialog-document-view.tsx`
- `/components/ui/sidebar.tsx`

**Actions:**
1. Compare with original shadcn/ui source code
2. Document if custom durations are original or added
3. Keep official shadcn patterns unchanged
4. Document any intentional customizations

**Expected Outcome:**
- Clear documentation of which duration classes are official
- Decision on any custom modifications

---

### Phase 2: Standardize New Components (Priority: Medium)
**Files:**
- `/app/[locale]/(routes)/components/nav-main.tsx`
- `/app/[locale]/(routes)/components/app-sidebar.tsx`

**Actions:**
1. Review each custom duration class
2. Decide: Keep for intentional effect, or remove for consistency
3. Apply consistent timing across related animations
4. Test animation feel with changes

**Expected Outcome:**
- Consistent animation timing across new layout components
- Intentional slow animations (like brand "N" symbol) documented

**Specific Decisions Needed:**

#### Decision 1: nav-main.tsx ChevronRight
**Options:**
- A. Keep `duration-200` (explicit, clear intent)
- B. Remove `duration-200`, use Tailwind default `duration-150` (simpler)

**Recommendation**: Option B - Use Tailwind default for consistency

#### Decision 2: app-sidebar.tsx "N" Symbol
**Options:**
- A. Keep `duration-500` (intentional slow brand animation)
- B. Change to `duration-300` (faster but still emphasis)
- C. Remove duration, use default `duration-150` (standard timing)

**Recommendation**: Option A - Keep slow animation for brand emphasis

#### Decision 3: app-sidebar.tsx App Name
**Options:**
- A. Keep `duration-200`
- B. Remove `duration-200`, use Tailwind default `duration-150`

**Recommendation**: Option B - Use Tailwind default for consistency

---

### Phase 3: Remove Legacy Components (Priority: Low)
**Files:**
- `/app/[locale]/(routes)/components/ModuleMenu.tsx`

**Actions:**
1. Verify ModuleMenu.tsx is fully replaced by app-sidebar.tsx
2. Delete ModuleMenu.tsx file
3. Remove any imports referencing ModuleMenu

**Expected Outcome:**
- Legacy component removed
- No more duplicate animation patterns

---

### Phase 4: Test Animation Performance (Priority: Medium)
**Testing Requirements:**

#### Desktop Testing
- [ ] Test on Chrome (latest)
- [ ] Test on Firefox (latest)
- [ ] Test on Safari (latest)
- [ ] Verify smooth animations at 60fps
- [ ] Test with browser DevTools performance profiler

#### Mobile Testing
- [ ] Test on iOS Safari (iPhone)
- [ ] Test on Android Chrome
- [ ] Verify animations don't cause jank
- [ ] Test on lower-end devices if possible

#### Specific Animation Tests
- [ ] Sidebar expand/collapse (should be smooth)
- [ ] Navigation collapsible groups (should be responsive)
- [ ] Dialog open/close (should be smooth)
- [ ] Sheet open/close (should be smooth)
- [ ] Hover effects (should be immediate)

#### Performance Benchmarks
- [ ] No janky animations (dropped frames)
- [ ] Animations complete in stated duration
- [ ] No layout shift during animations
- [ ] CPU usage reasonable during animations

---

## Animation Best Practices

### 1. Use Tailwind Default Durations
Prefer Tailwind's default `duration-150` unless there's specific need:
```tsx
// Good - uses default
<div className="transition-transform">

// Good - explicit when needed
<div className="transition-transform duration-200">

// Avoid - unnecessary explicit default
<div className="transition-transform duration-150">
```

### 2. Use data-[state] Animations
For state-based animations, use Radix UI patterns:
```tsx
// Good
<Component className="data-[state=open]:animate-in data-[state=closed]:animate-out" />

// Avoid custom animation classes
<Component className="custom-fade-in-animation" />
```

### 3. Specify Transition Properties
Be explicit about what transitions:
```tsx
// Good - explicit properties
<div className="transition-[width,opacity] duration-200">

// Less ideal - transitions everything
<div className="transition-all duration-200">
```

### 4. Use Appropriate Easing
- `ease-linear` - For constant speed (sidebar width, progress bars)
- `ease-in-out` - For natural feel (most animations)
- `ease-in` - For starting slowly (exit animations)
- `ease-out` - For ending slowly (enter animations)

```tsx
// Example: sidebar width
<div className="transition-[width] duration-200 ease-linear">

// Example: dialog entrance
<div className="transition-opacity duration-200 ease-out">
```

### 5. Match Related Animations
Components that appear together should have consistent timing:
```tsx
// Sidebar and its icons should match
<Sidebar className="transition-[width] duration-200" />
<Icon className="transition-transform duration-200" />
```

---

## Summary of Required Changes

### Files to Update
| File | Current Duration | Recommended Action | Priority |
|------|-----------------|-------------------|----------|
| nav-main.tsx | `duration-200` | Remove (use default) | Medium |
| app-sidebar.tsx (N symbol) | `duration-500` | Keep (brand emphasis) | Low |
| app-sidebar.tsx (text) | `duration-200` | Remove (use default) | Medium |
| dialog.tsx | `duration-200` | Verify shadcn default | High |
| dialog-document-view.tsx | `duration-200` | Match dialog.tsx | High |
| sidebar.tsx | `duration-200` | Keep (shadcn default) | Low |
| ModuleMenu.tsx | Multiple | Remove file | Low |

### Total Changes Required
- **High Priority**: 2 files (verify/document)
- **Medium Priority**: 2 files (standardize)
- **Low Priority**: 2 files (document/remove)
- **Total**: 6 files

### Estimated Effort
- Verification: 1 hour
- Implementation: 2 hours
- Testing: 2 hours
- Documentation: 1 hour
- **Total**: 6 hours

---

## Testing Checklist

### Functional Tests
- [ ] Sidebar expand/collapse works smoothly
- [ ] Navigation collapsible groups expand/close smoothly
- [ ] Dialogs open/close smoothly
- [ ] Sheets open/close smoothly
- [ ] All animations complete without interruption
- [ ] No visual glitches during animations

### Visual Tests
- [ ] Animation timing feels consistent across components
- [ ] No animations feel too fast or too slow
- [ ] Related animations have matching durations
- [ ] Brand "N" symbol rotation has appropriate emphasis
- [ ] Mobile animations work as well as desktop

### Performance Tests
- [ ] No dropped frames during animations
- [ ] Animations perform well on lower-end devices
- [ ] No excessive CPU usage during animations
- [ ] Multiple simultaneous animations don't cause jank

### Cross-Browser Tests
- [ ] Chrome animations smooth
- [ ] Firefox animations smooth
- [ ] Safari animations smooth
- [ ] Edge animations smooth
- [ ] Mobile Safari animations smooth
- [ ] Mobile Chrome animations smooth

---

## Documentation Required

### 1. Animation Standards Document
Create document explaining animation philosophy:
- When to use explicit durations
- When to use Tailwind defaults
- How to choose easing functions
- Performance considerations

### 2. Component Animation Guide
Document animation patterns for each component type:
- Sidebar animations
- Dialog animations
- Sheet animations
- Navigation animations
- Hover/focus animations

### 3. Migration Guide
For future developers:
- How to add new animated components
- How to match existing patterns
- Common mistakes to avoid
- Testing checklist for animations

---

## Next Steps

1. Review and approve this audit document
2. Verify shadcn default patterns (Phase 1)
3. Make standardization decisions (Phase 2)
4. Implement approved changes
5. Test animation performance (Phase 4)
6. Remove legacy components (Phase 3)
7. Create animation standards documentation
8. Update tasks.md to mark subtasks complete

---

**Audit Completed**: 2025-11-06
**Auditor**: Claude Code
**Status**: Ready for implementation
