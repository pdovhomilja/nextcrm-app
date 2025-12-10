# Accessibility Testing Guide
## Task Group 6.3 - Phase 6

**Date**: 2025-11-08
**Spec**: Layout Migration to shadcn dashboard-01
**Purpose**: Comprehensive accessibility testing checklist (WCAG 2.1 AA compliance)

---

## Overview

This document provides a systematic approach to testing accessibility compliance for the new layout, ensuring the application is usable by people with disabilities.

**Target Standard**: WCAG 2.1 Level AA
**Testing Tools**: axe DevTools, Lighthouse, Keyboard, Screen readers (if available)

---

## Task 6.3.1: Keyboard Navigation Testing

### General Keyboard Navigation

**Basic Keyboard Controls**:
- **Tab**: Move focus forward
- **Shift+Tab**: Move focus backward
- **Enter**: Activate buttons/links
- **Space**: Activate buttons, toggle checkboxes
- **Escape**: Close modals/dropdowns
- **Arrow Keys**: Navigate within components (dropdowns, radio groups)

---

### Sidebar Navigation

**Test Checklist**:
- [ ] Tab reaches sidebar navigation items
- [ ] Focus indicators visible on all navigation items
- [ ] Enter key activates navigation items
- [ ] Space key activates navigation items
- [ ] Tab order is logical (top-to-bottom, left-to-right)
- [ ] Collapsible groups can be toggled with Enter/Space
- [ ] Arrow keys navigate within expanded groups (if applicable)
- [ ] Escape key collapses expanded groups
- [ ] Focus remains visible during sidebar collapse/expand
- [ ] Logo/brand link is keyboard accessible
- [ ] Sidebar toggle (rail) is keyboard accessible

**Focus Order**:
1. Skip to main content link (if present)
2. Sidebar trigger (mobile)
3. Logo/brand
4. Navigation items (top to bottom)
5. Nav-user dropdown trigger
6. Main content area
7. Footer links

---

### Header Navigation

**Test Checklist**:
- [ ] Tab reaches all header components
- [ ] Search input is keyboard accessible
- [ ] Command palette (if present) opens with keyboard shortcut
- [ ] Language selector is keyboard accessible
- [ ] Theme toggle is keyboard accessible
- [ ] Support/Feedback buttons are keyboard accessible
- [ ] All dropdowns open with Enter/Space
- [ ] All dropdowns close with Escape
- [ ] Focus returns to trigger after closing dropdown

---

### Nav-User Dropdown

**Test Checklist**:
- [ ] Tab reaches nav-user button
- [ ] Enter/Space opens dropdown
- [ ] Arrow keys navigate dropdown items
- [ ] Enter activates dropdown items
- [ ] Escape closes dropdown
- [ ] Focus returns to trigger after closing
- [ ] Focus trap works (Tab cycles within dropdown)
- [ ] Logout link is keyboard accessible

---

### Modal/Dialog Components

**Test Checklist**:
- [ ] Focus moves to modal when opened
- [ ] Focus trap works (Tab stays within modal)
- [ ] Escape key closes modal
- [ ] Close button (X) is keyboard accessible
- [ ] Cancel button is keyboard accessible
- [ ] Submit button is keyboard accessible
- [ ] Focus returns to trigger after closing modal

---

### Form Elements

**Test Checklist**:
- [ ] All inputs are keyboard accessible
- [ ] Tab order follows visual layout
- [ ] Radio buttons navigate with arrow keys
- [ ] Checkboxes toggle with Space
- [ ] Dropdowns/selects navigate with arrow keys
- [ ] Date pickers are keyboard accessible
- [ ] File upload inputs are keyboard accessible

---

### Keyboard Navigation Issues to Watch

**Common Problems**:
- Focus indicators missing or invisible
- Tab order illogical (jumps around page)
- Focus trapped unintentionally
- Keyboard shortcuts conflict with browser/screen reader shortcuts
- Custom components not keyboard accessible
- Skip links missing

---

## Task 6.3.2: Screen Reader Compatibility

### Screen Readers to Test (If Available)

**macOS/iOS**: VoiceOver
- Enable: System Preferences > Accessibility > VoiceOver (Cmd+F5)

**Windows**: NVDA (Free)
- Download: https://www.nvaccess.org/download/

**Windows**: JAWS (Commercial)
- Download: https://www.freedomscientific.com/products/software/jaws/

**Chrome Extension**: ChromeVox
- Install from Chrome Web Store

---

### Sidebar Testing with Screen Reader

**Test Checklist**:
- [ ] Screen reader announces "navigation" or "menu"
- [ ] Screen reader announces each navigation item
- [ ] Screen reader announces expanded/collapsed state of groups
- [ ] Screen reader announces active/current item
- [ ] Screen reader announces "N" symbol as "NextCRM logo" or similar
- [ ] Screen reader reads build version text
- [ ] Screen reader announces when navigation item is clicked

**Expected Announcements**:
- "Navigation landmark"
- "Dashboard, link"
- "CRM, button, collapsed" or "CRM, button, expanded"
- "Accounts, link"
- "User menu, button"

---

### Header Testing with Screen Reader

**Test Checklist**:
- [ ] Screen reader announces "banner" or "header" landmark
- [ ] Screen reader announces search input with label
- [ ] Screen reader announces theme toggle with state
- [ ] Screen reader announces language selector
- [ ] Screen reader announces all interactive elements

---

### Nav-User Testing with Screen Reader

**Test Checklist**:
- [ ] Screen reader announces "menu" or "navigation"
- [ ] Screen reader announces user name
- [ ] Screen reader announces user email
- [ ] Screen reader announces dropdown items (Profile, Settings, Logout)
- [ ] Screen reader announces when dropdown opens/closes

---

### ARIA Attributes to Verify

**Required ARIA**:
- `aria-label` or `aria-labelledby` on navigation elements
- `aria-expanded` on collapsible groups (true/false)
- `aria-current="page"` on active navigation item
- `aria-haspopup="menu"` on dropdown triggers
- `aria-controls` linking triggers to controlled elements
- `aria-hidden="true"` on decorative icons
- `role="navigation"` on nav elements
- `role="menu"` on dropdown menus
- `role="menuitem"` on dropdown items
- `role="button"` on interactive non-button elements

**Verify with DevTools**:
1. Right-click element > Inspect
2. Check "Accessibility" pane
3. Verify ARIA attributes present and correct

---

### Manual Screen Reader Testing (If Available)

**VoiceOver (macOS) Basic Commands**:
- `Cmd+F5`: Toggle VoiceOver on/off
- `VO+Right Arrow`: Move to next item
- `VO+Left Arrow`: Move to previous item
- `VO+Space`: Activate item
- `VO` = `Control+Option`

**NVDA (Windows) Basic Commands**:
- `Insert+Down Arrow`: Read next item
- `Insert+Up Arrow`: Read previous item
- `Enter`: Activate item
- `Insert+F7`: List all links/headings

**Test Procedure**:
1. Enable screen reader
2. Navigate to application
3. Use only screen reader (no mouse)
4. Navigate through sidebar, header, content
5. Verify all content is announced correctly
6. Verify interactive elements are accessible
7. Document any issues

---

### Fallback: Manual ARIA Audit (No Screen Reader)

If screen readers are not available, manually audit ARIA attributes:

**Checklist**:
- [ ] Inspect sidebar in DevTools
- [ ] Verify `role="navigation"` present
- [ ] Verify navigation items have proper labels
- [ ] Verify collapsible groups have `aria-expanded`
- [ ] Verify active item has `aria-current="page"`
- [ ] Inspect nav-user dropdown
- [ ] Verify `role="menu"` and `role="menuitem"`
- [ ] Verify all interactive elements have accessible names
- [ ] Verify focus indicators visible in DevTools

---

## Task 6.3.3: Color Contrast Testing

### WCAG AA Requirements

**Normal Text** (< 18pt or < 14pt bold):
- Minimum contrast ratio: **4.5:1**

**Large Text** (≥ 18pt or ≥ 14pt bold):
- Minimum contrast ratio: **3:1**

**UI Components & Graphics**:
- Minimum contrast ratio: **3:1**

---

### Light Mode Contrast

**Test Checklist**:
- [ ] Sidebar background vs text: ≥4.5:1
- [ ] Navigation item text vs background: ≥4.5:1
- [ ] Active navigation item contrast: ≥4.5:1
- [ ] Header text vs background: ≥4.5:1
- [ ] Main content text vs background: ≥4.5:1
- [ ] Button text vs background: ≥4.5:1
- [ ] Link text vs background: ≥4.5:1
- [ ] Build version text vs background: ≥4.5:1 (or ≥3:1 if small)
- [ ] Focus indicators vs background: ≥3:1
- [ ] Disabled elements have sufficient indication (not just color)

**Chrome DevTools Contrast Checker**:
1. Inspect element with text
2. Open "Styles" pane
3. Click color swatch next to color value
4. View contrast ratio in color picker
5. Verify ratio meets WCAG AA (shows checkmark)

---

### Dark Mode Contrast

**Test Checklist**:
- [ ] Sidebar background vs text: ≥4.5:1
- [ ] Navigation item text vs background: ≥4.5:1
- [ ] Active navigation item contrast: ≥4.5:1
- [ ] Header text vs background: ≥4.5:1
- [ ] Main content text vs background: ≥4.5:1
- [ ] Button text vs background: ≥4.5:1
- [ ] Link text vs background: ≥4.5:1
- [ ] Build version text vs background: ≥4.5:1 (or ≥3:1 if small)
- [ ] Focus indicators vs background: ≥3:1
- [ ] Disabled elements have sufficient indication

**Testing Tool**:
Use same Chrome DevTools contrast checker in dark mode.

---

### Focus Indicators

**Requirements**:
- Focus indicators must be visible (not hidden)
- Contrast ratio vs background: ≥3:1
- Thickness: ≥2px (recommended)
- Color: Should not rely solely on color for indication

**Test Checklist**:
- [ ] Tab through all interactive elements
- [ ] Focus indicator visible on each element
- [ ] Focus indicator has sufficient contrast
- [ ] Focus indicator doesn't obscure content
- [ ] Focus indicator works in light and dark mode

---

### Color-Blind Testing

**Types to Consider**:
- Deuteranopia (red-green) - most common
- Protanopia (red-green)
- Tritanopia (blue-yellow)

**Test Checklist**:
- [ ] Active state doesn't rely solely on color
- [ ] Error states use icons + color
- [ ] Success states use icons + color
- [ ] Links distinguishable without color (underline)
- [ ] Disabled states use opacity + color

**Testing Tool**:
Chrome extension: "Colorblind - Dalton for Google Chrome"

---

## Task 6.3.4: Automated Accessibility Tools

### axe DevTools

**Installation**:
1. Install "axe DevTools - Web Accessibility Testing" Chrome extension
2. Or visit: https://www.deque.com/axe/devtools/

**Testing Procedure**:
1. Open application page (e.g., /dashboard)
2. Open Chrome DevTools (F12)
3. Click "axe DevTools" tab
4. Click "Scan ALL of my page"
5. Review issues found

**Issue Priorities**:
- **Critical**: Must fix (blocks users)
- **Serious**: Should fix (significant barrier)
- **Moderate**: Consider fixing (minor barrier)
- **Minor**: Nice to fix (best practice)

**Test Checklist**:
- [ ] Run axe scan on /dashboard
- [ ] Run axe scan on /crm/accounts
- [ ] Run axe scan on /projects
- [ ] Run axe scan with sidebar collapsed
- [ ] Run axe scan with sidebar expanded
- [ ] Run axe scan with nav-user dropdown open
- [ ] Review all Critical issues
- [ ] Review all Serious issues
- [ ] Fix P0/P1 issues (Critical/Serious)
- [ ] Document P2/P3 issues (Moderate/Minor)

---

### Lighthouse Accessibility Audit

**Running Lighthouse** (Built into Chrome):
1. Open Chrome DevTools (F12)
2. Click "Lighthouse" tab
3. Select "Accessibility" category only
4. Click "Analyze page load"
5. Review results

**Test Checklist**:
- [ ] Run Lighthouse on /dashboard
- [ ] Run Lighthouse on /crm/accounts
- [ ] Run Lighthouse on /projects
- [ ] Achieve score ≥ 90 (Good)
- [ ] Fix all failing audits
- [ ] Document manual checks needed

**Target Score**: ≥ 90 (Good to Excellent)

**Common Lighthouse Issues**:
- Missing alt text on images
- Insufficient color contrast
- Missing form labels
- Missing ARIA attributes
- Duplicate IDs
- Low contrast ratios

---

### WAVE (Web Accessibility Evaluation Tool)

**Installation** (Optional):
Browser extension: https://wave.webaim.org/extension/

**Testing Procedure**:
1. Install WAVE extension
2. Navigate to application page
3. Click WAVE icon
4. Review errors, alerts, features

**Test Checklist**:
- [ ] Run WAVE on main pages
- [ ] Review all errors (red icons)
- [ ] Review all alerts (yellow icons)
- [ ] Fix critical errors
- [ ] Document warnings

---

## Semantic HTML Verification

### Required Semantic Elements

**Test Checklist**:
- [ ] `<nav>` element used for sidebar navigation
- [ ] `<header>` element used for page header
- [ ] `<main>` element used for main content area
- [ ] `<footer>` element used for page footer
- [ ] `<button>` elements used for buttons (not divs)
- [ ] `<a>` elements used for links (not divs)
- [ ] Headings follow logical order (h1 → h2 → h3)
- [ ] No skipped heading levels
- [ ] Form labels associated with inputs
- [ ] Lists use `<ul>`, `<ol>`, `<li>` elements

---

## Acceptance Criteria (Task 6.3)

### Must Pass (P0/P1)

- ✅ All interactive elements keyboard accessible
- ✅ Logical tab order throughout layout
- ✅ Focus indicators visible on all elements
- ✅ Escape key closes modals/dropdowns
- ✅ ARIA attributes present and correct (manual audit)
- ✅ Color contrast meets WCAG AA (4.5:1 for text)
- ✅ Focus indicators have 3:1 contrast
- ✅ axe DevTools shows zero Critical issues
- ✅ axe DevTools shows zero Serious issues
- ✅ Lighthouse accessibility score ≥ 90

### Should Pass (P2)

- ✅ Screen reader compatibility verified (if available) OR manual ARIA audit complete
- ✅ Semantic HTML structure correct
- ✅ No duplicate IDs
- ✅ All images have alt text
- ✅ Form labels associated with inputs

### Nice to Have (P3)

- Skip to main content link
- Keyboard shortcuts documented
- High contrast mode support
- Reduced motion support (prefers-reduced-motion)

---

## Issue Tracking Template

```markdown
### Accessibility Issue: [Brief Description]

**Severity**: Critical / Serious / Moderate / Minor
**WCAG Criterion**: [e.g., 1.4.3 Contrast, 2.1.1 Keyboard]
**Tool**: [axe DevTools / Lighthouse / Manual]
**Location**: [/dashboard sidebar]

**Issue**:
Focus indicator not visible on navigation items.

**Impact**:
Keyboard users cannot see where focus is.

**Fix**:
Add visible focus ring to navigation items:
```css
.nav-item:focus {
  outline: 2px solid blue;
  outline-offset: 2px;
}
```

**Status**: [ ] Open / [ ] In Progress / [ ] Fixed
```

---

## Test Results Summary Template

```markdown
# Accessibility Testing Results

**Date**: 2025-11-08
**Tester**: [Name]
**Standard**: WCAG 2.1 AA

## Summary
- **Critical Issues**: [Number]
- **Serious Issues**: [Number]
- **Moderate Issues**: [Number]
- **Minor Issues**: [Number]

## Tool Results
- **axe DevTools**: [Score / Issues]
- **Lighthouse**: [Score / 100]
- **WAVE**: [Errors / Alerts]

## Keyboard Navigation
- ✅ Pass / ⚠️ Issues Found

## Screen Reader Compatibility
- ✅ Pass / ⚠️ Issues Found / ⏭️ Manual ARIA Audit

## Color Contrast
- Light Mode: ✅ Pass / ⚠️ Issues Found
- Dark Mode: ✅ Pass / ⚠️ Issues Found

## Issues Requiring Fix
[List P0/P1 issues]

## Recommendations
[Suggestions for improvement]
```

---

## Notes for Implementation

**Pragmatic Approach** (given constraints):
1. Use automated tools (axe DevTools, Lighthouse) as primary testing method
2. Manual ARIA audit if screen readers not available
3. Chrome DevTools contrast checker for all text
4. Focus on P0/P1 issues (blocking accessibility)
5. Document P2/P3 for future improvement

**Time Estimate**: 3-4 hours for comprehensive accessibility testing

**shadcn/ui Components**: Generally accessibility-friendly out-of-the-box, but verify custom implementations and overrides.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**Task Group**: 6.3 - Accessibility Testing
