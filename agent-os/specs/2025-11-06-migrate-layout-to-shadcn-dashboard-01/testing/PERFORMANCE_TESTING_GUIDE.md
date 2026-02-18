# Performance Testing & Optimization Guide
## Task Group 6.4 - Phase 6

**Date**: 2025-11-08
**Spec**: Layout Migration to shadcn dashboard-01
**Purpose**: Performance testing checklist and optimization strategies

---

## Overview

This document provides a systematic approach to testing and optimizing performance for the new layout, focusing on Core Web Vitals and user-perceived performance.

**Target Metrics** (WCAG 2.1 AA compliance):
- **LCP** (Largest Contentful Paint): < 2.5s (Good)
- **FID** (First Input Delay) / **INP** (Interaction to Next Paint): < 100ms / < 200ms (Good)
- **CLS** (Cumulative Layout Shift): < 0.1 (Good)
- **TTFB** (Time to First Byte): < 600ms (Good)
- **FCP** (First Contentful Paint): < 1.8s (Good)

---

## Task 6.4.1: Initial Page Load Performance

### Lighthouse Performance Audit

**Running Lighthouse**:
1. Open Chrome DevTools (F12)
2. Click "Lighthouse" tab
3. Select "Performance" category
4. Select "Desktop" or "Mobile" device
5. Click "Analyze page load"
6. Review results

**Test Checklist**:
- [ ] Run Lighthouse on /dashboard (desktop)
- [ ] Run Lighthouse on /dashboard (mobile)
- [ ] Run Lighthouse on /crm/accounts (desktop)
- [ ] Run Lighthouse on /crm/accounts (mobile)
- [ ] Run Lighthouse on /projects (desktop)
- [ ] Run Lighthouse on /projects (mobile)

**Target Scores**:
- **Desktop**: ≥ 90 (Good to Excellent)
- **Mobile**: ≥ 80 (Good)

---

### Core Web Vitals

#### Time to First Byte (TTFB)

**What it measures**: Time from request to first byte of response
**Target**: < 600ms (Good)

**Test Checklist**:
- [ ] Open Chrome DevTools > Network tab
- [ ] Reload page
- [ ] Check "Waiting (TTFB)" time for document request
- [ ] Verify < 600ms

**Optimization Strategies** (if > 600ms):
- Server-side rendering optimization
- Database query optimization
- CDN usage
- Server location closer to users
- Caching headers

---

#### First Contentful Paint (FCP)

**What it measures**: Time until first content appears
**Target**: < 1.8s (Good)

**Test Checklist**:
- [ ] Run Lighthouse audit
- [ ] Check FCP metric in results
- [ ] Verify < 1.8s

**Optimization Strategies** (if > 1.8s):
- Reduce blocking JavaScript
- Optimize critical CSS
- Use font-display: swap
- Minimize render-blocking resources
- Inline critical CSS

---

#### Largest Contentful Paint (LCP)

**What it measures**: Time until largest content element is rendered
**Target**: < 2.5s (Good)

**Common LCP Elements**:
- Hero images
- Large text blocks
- Main content area
- Sidebar (if large)

**Test Checklist**:
- [ ] Run Lighthouse audit
- [ ] Check LCP metric in results
- [ ] Identify LCP element (shown in Lighthouse)
- [ ] Verify < 2.5s

**Optimization Strategies** (if > 2.5s):
- Optimize LCP element (compress images, lazy load)
- Preload critical resources
- Reduce server response time (TTFB)
- Optimize rendering path
- Use CDN for static assets
- Implement image optimization (Next.js Image component)

---

#### Cumulative Layout Shift (CLS)

**What it measures**: Visual stability (unexpected layout shifts)
**Target**: < 0.1 (Good)

**Common CLS Causes**:
- Images without dimensions
- Ads/embeds without reserved space
- Web fonts causing FOIT/FOUT
- Dynamic content insertion

**Test Checklist**:
- [ ] Run Lighthouse audit
- [ ] Check CLS metric in results
- [ ] Identify shifting elements (shown in Lighthouse)
- [ ] Verify < 0.1

**Layout Shift Scenarios to Test**:
- [ ] Sidebar expanding/collapsing doesn't shift content
- [ ] Navigation loading doesn't shift layout
- [ ] User avatar loading doesn't shift nav-user
- [ ] Fonts loading doesn't cause text shift
- [ ] Theme switching doesn't cause layout shift

**Optimization Strategies** (if > 0.1):
- Set explicit width/height on images
- Reserve space for dynamic content
- Use font-display: optional or swap
- Avoid inserting content above existing content
- Use transform for animations (not width/height)
- Set sidebar dimensions explicitly

---

#### First Input Delay (FID) / Interaction to Next Paint (INP)

**What it measures**: Responsiveness to user interaction
**FID Target**: < 100ms (Good)
**INP Target**: < 200ms (Good)

**Note**: FID is being replaced by INP in Core Web Vitals

**Test Checklist**:
- [ ] Run Lighthouse audit
- [ ] Check FID/INP metric (may require field data)
- [ ] Test sidebar toggle responsiveness
- [ ] Test navigation clicks responsiveness
- [ ] Test dropdown opens responsiveness
- [ ] Verify < 100ms (FID) or < 200ms (INP)

**Optimization Strategies** (if > targets):
- Reduce JavaScript execution time
- Break up long tasks
- Use web workers for heavy computation
- Defer non-critical JavaScript
- Optimize event handlers
- Use CSS animations over JavaScript animations
- Implement code splitting

---

### Performance Metrics Summary

**Lighthouse Score Breakdown**:
- Performance: [0-100]
- Accessibility: [0-100]
- Best Practices: [0-100]
- SEO: [0-100]

**Core Web Vitals**:
- LCP: [time] - [Good/Needs Improvement/Poor]
- FID/INP: [time] - [Good/Needs Improvement/Poor]
- CLS: [score] - [Good/Needs Improvement/Poor]

---

## Task 6.4.2: Layout Shift and Stability

### Manual Layout Shift Testing

**Test Scenarios**:

#### Sidebar Collapse/Expand
- [ ] Expand sidebar: Content area doesn't shift
- [ ] Collapse sidebar: Content area resizes smoothly
- [ ] Animation is smooth (no jank)
- [ ] No content jump during animation
- [ ] Text doesn't reflow unexpectedly

#### Navigation Loading
- [ ] Module items load without layout shift
- [ ] Navigation icons load without layout shift
- [ ] User avatar loads without layout shift
- [ ] Build version appears without layout shift

#### Theme Switching
- [ ] Toggle light→dark: No layout shift
- [ ] Toggle dark→light: No layout shift
- [ ] Sidebar dimensions don't change
- [ ] Content area doesn't shift

#### Font Loading
- [ ] Fonts load without visible text shift
- [ ] Font fallback doesn't cause layout shift
- [ ] Use font-display: optional or swap

---

### Chrome DevTools Layout Shift Detection

**Enable Layout Shift Regions**:
1. Open Chrome DevTools (F12)
2. Click three dots (⋮) > More tools > Rendering
3. Enable "Layout Shift Regions"
4. Blue highlight shows when layout shifts occur

**Test Procedure**:
1. Enable Layout Shift Regions
2. Reload page
3. Watch for blue highlights
4. Investigate any shifts
5. Fix causes

---

### Lighthouse CLS Audit

**Test Checklist**:
- [ ] Run Lighthouse audit
- [ ] Check CLS score < 0.1
- [ ] Review "Avoid large layout shifts" audit
- [ ] Identify elements causing shifts
- [ ] Fix high-impact shifts

---

## Task 6.4.3: Interaction Responsiveness

### Sidebar Toggle Speed

**Test Checklist**:
- [ ] Click sidebar toggle (rail)
- [ ] Measure time from click to animation start
- [ ] Should feel instant (< 50ms)
- [ ] Animation duration appropriate (200-300ms)
- [ ] No lag or delay

**Testing Tool**: Chrome DevTools Performance tab
1. Click "Record" button (⚪)
2. Click sidebar toggle
3. Stop recording
4. Review timeline
5. Measure time from click to layout change

**Target**:
- Click to response: < 50ms
- Animation duration: 200-300ms (shadcn default)
- Total interaction: < 350ms

---

### Navigation Click Speed

**Test Checklist**:
- [ ] Click navigation item
- [ ] Page navigates quickly (< 500ms)
- [ ] Active state updates immediately
- [ ] No perceived lag

**Testing**:
- Manual: Click and observe
- DevTools: Record performance, measure time

---

### Dropdown Open Speed

**Test Checklist**:
- [ ] Click nav-user dropdown
- [ ] Dropdown opens immediately (< 100ms)
- [ ] Animation smooth
- [ ] No jank or delay

---

### Overall Interaction Responsiveness

**Test Checklist**:
- [ ] All buttons respond within 100ms
- [ ] All links respond within 100ms
- [ ] All inputs respond within 100ms
- [ ] Hover states update immediately
- [ ] Focus states update immediately

---

### Chrome DevTools Performance Profiling

**Recording a Performance Profile**:
1. Open Chrome DevTools > Performance tab
2. Click "Record" (⚪)
3. Perform interactions (sidebar toggle, navigation, etc.)
4. Stop recording
5. Analyze timeline

**What to Look For**:
- Long tasks (> 50ms) marked in red
- Layout thrashing (multiple layouts in short time)
- JavaScript execution time
- Paint and composite time

**Target**:
- No tasks > 50ms (blocking)
- 60fps during animations (16.67ms per frame)
- Minimal layout/paint time

---

## Task 6.4.4: Optimization Strategies

### If LCP > 2.5s

**Identify Bottleneck**:
1. Run Lighthouse audit
2. Check "Largest Contentful Paint element" in report
3. Identify what's slow (image, text, etc.)

**Optimization Strategies**:
- **Image Optimization**:
  - Use Next.js Image component
  - Compress images (WebP format)
  - Set explicit width/height
  - Use responsive images (srcset)
  - Lazy load below-the-fold images

- **Server Response**:
  - Optimize database queries
  - Implement server-side caching
  - Use CDN for static assets
  - Reduce server processing time

- **Rendering Path**:
  - Inline critical CSS
  - Defer non-critical JavaScript
  - Preload critical resources
  - Eliminate render-blocking resources

- **Code Splitting**:
  - Split large bundles
  - Lazy load routes
  - Dynamic imports for heavy components

---

### If CLS > 0.1

**Optimization Strategies**:
- **Images**:
  - Set explicit width and height attributes
  - Use Next.js Image with dimensions
  - Reserve space with aspect-ratio CSS

- **Fonts**:
  - Use font-display: optional or swap
  - Preload critical fonts
  - Use system fonts as fallback
  - Consider variable fonts

- **Dynamic Content**:
  - Reserve space for loading content
  - Use skeleton screens
  - Avoid inserting content above existing content
  - Use CSS transforms for animations (not layout properties)

- **Sidebar Animation**:
  - Use transform instead of width
  - Use CSS transitions/animations
  - Avoid JavaScript-based layout changes

---

### If INP > 200ms

**Optimization Strategies**:
- **Reduce JavaScript Execution**:
  - Remove unused code
  - Defer non-critical scripts
  - Use code splitting
  - Lazy load heavy components

- **Optimize Event Handlers**:
  - Debounce/throttle frequent events
  - Use passive event listeners
  - Minimize work in event handlers
  - Use requestAnimationFrame for visual updates

- **Break Up Long Tasks**:
  - Use setTimeout to yield to browser
  - Use web workers for heavy computation
  - Split large operations into chunks

- **Optimize Rendering**:
  - Minimize DOM manipulation
  - Batch updates
  - Use CSS for animations
  - Avoid forced reflows (layout thrashing)

---

### If Bundle Size is Large

**Check Bundle Size**:
```bash
# Build production bundle
pnpm build

# Analyze bundle
npx @next/bundle-analyzer
```

**Optimization Strategies**:
- Remove unused dependencies
- Use tree-shaking
- Lazy load routes and components
- Replace large libraries with smaller alternatives
- Code split by route
- Dynamic imports for heavy features

**Next.js Bundle Analyzer**:
```bash
# Install
pnpm add -D @next/bundle-analyzer

# Add to next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

# Run
ANALYZE=true pnpm build
```

---

## Performance Testing Checklist

### Desktop Performance
- [ ] Lighthouse score ≥ 90
- [ ] LCP < 2.5s
- [ ] FID/INP < 100ms/200ms
- [ ] CLS < 0.1
- [ ] TTFB < 600ms
- [ ] FCP < 1.8s
- [ ] Sidebar toggle < 350ms total
- [ ] Navigation click < 500ms
- [ ] No long tasks > 50ms
- [ ] 60fps during animations

### Mobile Performance
- [ ] Lighthouse score ≥ 80
- [ ] LCP < 2.5s
- [ ] FID/INP < 100ms/200ms
- [ ] CLS < 0.1
- [ ] TTFB < 600ms
- [ ] FCP < 1.8s
- [ ] Touch interactions responsive
- [ ] No jank on mobile

---

## Acceptance Criteria (Task 6.4)

### Must Pass (P0)
- ✅ Desktop Lighthouse Performance score ≥ 90
- ✅ Mobile Lighthouse Performance score ≥ 80
- ✅ LCP < 2.5s (Good)
- ✅ CLS < 0.1 (Good)
- ✅ No P0 performance regressions vs. previous layout

### Should Pass (P1)
- ✅ FID/INP < 100ms/200ms (Good)
- ✅ TTFB < 600ms
- ✅ FCP < 1.8s
- ✅ Sidebar toggle feels instant (< 350ms)
- ✅ Navigation clicks feel instant (< 500ms)

### Nice to Have (P2)
- All optimizations implemented
- Bundle size minimized
- No long tasks > 50ms
- 60fps maintained during all animations

---

## Test Results Template

```markdown
# Performance Testing Results

**Date**: 2025-11-08
**Tester**: [Name]
**Device**: Desktop / Mobile

## Lighthouse Scores
- **Performance**: [Score/100]
- **Accessibility**: [Score/100]
- **Best Practices**: [Score/100]
- **SEO**: [Score/100]

## Core Web Vitals
- **LCP**: [time] - ✅ Good / ⚠️ Needs Improvement / ❌ Poor
- **FID/INP**: [time] - ✅ Good / ⚠️ Needs Improvement / ❌ Poor
- **CLS**: [score] - ✅ Good / ⚠️ Needs Improvement / ❌ Poor

## Additional Metrics
- **TTFB**: [time]
- **FCP**: [time]
- **Bundle Size**: [KB]

## Performance Issues
[List any issues found]

## Optimizations Applied
[List optimizations implemented]

## Recommendations
[Suggestions for further improvement]
```

---

## Notes for Implementation

**Pragmatic Approach**:
1. Use Lighthouse as primary testing tool
2. Focus on Core Web Vitals (LCP, CLS, INP)
3. Test on desktop and mobile
4. Compare with baseline (if available)
5. Fix P0 issues blocking release
6. Document P1/P2 for future optimization

**Time Estimate**: 3-4 hours for comprehensive performance testing and basic optimizations

**shadcn/ui Performance**: Generally performant, but verify custom implementations don't introduce performance issues.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**Task Group**: 6.4 - Performance Testing & Optimization
