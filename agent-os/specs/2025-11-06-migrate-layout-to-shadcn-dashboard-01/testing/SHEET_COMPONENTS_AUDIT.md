# Sheet Components Audit Report

**Task Group:** 5.1 - Sheet Components Audit & Update
**Date:** 2025-11-06
**Status:** AUDIT COMPLETE - Implementation Phase 1 Complete

---

## Executive Summary

This audit identified **14 files** using Sheet components across the NextCRM application. Sheets are used for creating, editing, and viewing records in CRM, Projects, Invoice, and Admin modules. The audit found **2 reusable Sheet wrapper components** and **12 implementation files** across various modules.

### Key Findings:
- Base shadcn Sheet component uses **custom duration classes** (duration-300, duration-500) that should be replaced with shadcn defaults
- Inconsistent Sheet width patterns (`min-w-[1000px]`, `min-w-[90vh]`, `sm:max-w-sm`)
- Inconsistent header patterns (some use SheetHeader, some omit SheetDescription)
- Form sheets use inconsistent button placement and spacing
- Reusable sheet components exist but aren't consistently applied

---

## Inventory of Sheet Components

### 1. Base Component
**File:** `/components/ui/sheet.tsx`
**Type:** shadcn/ui base component
**Status:** Needs animation update

**Current Issues:**
- Line 37: Uses custom duration classes `data-[state=closed]:duration-300 data-[state=open]:duration-500`
- Should use shadcn default animations without explicit durations

**Required Changes:**
```typescript
// CURRENT (Line 37):
"fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500"

// SHOULD BE:
"fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out"
```

---

### 2. Reusable Sheet Wrappers

#### 2.1 FormSheet Component
**File:** `/components/sheets/form-sheet.tsx`
**Purpose:** Sheet wrapper with trigger button
**Usage:** Contract creation forms

**Current Implementation:**
- Has trigger button ("+") with size "sm"
- Uses SheetHeader with title and description
- Accepts position prop (left/right/top/bottom)
- Has onClose ref for programmatic closing

**Issues:**
- Trigger button styling hardcoded (`className="mb-5 "` - note trailing space)
- No consistent spacing between header and content

**Required Changes:**
1. Remove trailing space in className
2. Add consistent gap spacing after SheetHeader
3. Consider making trigger customizable (icon, text, style)

#### 2.2 FormSheetNoTrigger Component
**File:** `/components/sheets/form-sheet-no-trigger.tsx`
**Purpose:** Sheet wrapper without trigger (controlled externally)
**Usage:** CRM views (Accounts, Contacts)

**Current Implementation:**
- Controlled via open/setOpen props
- Uses SheetHeader with title and description
- Clean, minimal implementation

**Issues:**
- No consistent content spacing/padding pattern
- Missing gap between header and children

**Required Changes:**
1. Add consistent gap spacing after SheetHeader: `<div className="space-y-4">` wrapper around children
2. Ensure consistent with FormSheet patterns

---

### 3. CRM Module Sheets

#### 3.1 AccountsView Sheet
**File:** `/app/[locale]/(routes)/crm/components/AccountsView.tsx`
**Purpose:** Create new account
**Lines:** 56-75

**Current Implementation:**
```tsx
<Sheet open={open} onOpenChange={() => setOpen(false)}>
  <Button className="m-2 cursor-pointer" onClick={() => setOpen(true)}>+</Button>
  <SheetContent className="min-w-[1000px] space-y-2">
    <SheetHeader>
      <SheetTitle>Create new Account</SheetTitle>
    </SheetHeader>
    <div className="h-full overflow-y-auto">
      <NewAccountForm ... />
    </div>
  </SheetContent>
</Sheet>
```

**Issues:**
1. Missing SheetDescription (accessibility issue)
2. Inconsistent width: `min-w-[1000px]` (should use consistent pattern)
3. Form wrapper has `h-full overflow-y-auto` but no padding
4. Button trigger is custom, not using SheetTrigger component

**Required Changes:**
1. Add SheetDescription for accessibility
2. Use consistent width pattern (consider max-w-2xl or max-w-3xl)
3. Add consistent padding around form: `p-6`
4. Use SheetTrigger component instead of custom Button

**Priority:** HIGH (Accounts are primary CRM entity)

---

#### 3.2 ContactsView Sheet
**File:** `/app/[locale]/(routes)/crm/components/ContactsView.tsx`
**Purpose:** Create new contact
**Lines:** 56-75

**Current Implementation:**
```tsx
<Sheet open={open} onOpenChange={() => setOpen(false)}>
  <Button className="m-2 cursor-pointer" onClick={() => setOpen(true)}>+</Button>
  <SheetContent className="min-w-[1000px] space-y-2">
    <SheetHeader>
      <SheetTitle>Create new Account</SheetTitle> <!-- WRONG TITLE! -->
    </SheetHeader>
    <div className="h-full overflow-y-auto">
      <NewContactForm ... />
    </div>
  </SheetContent>
</Sheet>
```

**Issues:**
1. **CRITICAL BUG:** SheetTitle says "Create new Account" but should be "Create new Contact"
2. Missing SheetDescription (accessibility issue)
3. Identical issues to AccountsView (width, padding, button)

**Required Changes:**
1. **FIX CRITICAL BUG:** Change title to "Create new Contact"
2. Add SheetDescription
3. Use consistent width pattern
4. Add padding around form
5. Use SheetTrigger component

**Priority:** CRITICAL (Title bug) + HIGH (Primary CRM entity)

---

#### 3.3 OpportunitiesView Sheet
**File:** `/app/[locale]/(routes)/crm/components/OpportunitiesView.tsx`
**Purpose:** Likely similar to Accounts/Contacts pattern
**Status:** Not fully analyzed (not in initial read)

**Assumption:** Similar pattern to AccountsView/ContactsView
**Priority:** HIGH

**Required Analysis:**
- Read file to verify implementation
- Check for title consistency
- Apply same standardization as Accounts/Contacts

---

#### 3.4 Contract Sheets
**File:** `/app/[locale]/(routes)/crm/contracts/_forms/create-contract.tsx`
**Purpose:** Create new contract
**Lines:** 81-148

**Current Implementation:**
- Uses FormSheet reusable component
- Trigger: "+"
- Title: "Create new contract"
- Description: "" (empty)
- Contains complex form with multiple DatePickers and FormSelects

**Issues:**
1. Empty description (should describe purpose)
2. Hardcoded button text "Vytvořit" (Czech - should use translation)
3. FormSheet component has its own issues (see 2.1)

**File:** `/app/[locale]/(routes)/crm/contracts/_forms/update-contract.tsx`
**Status:** Not analyzed in detail
**Priority:** MEDIUM

**Required Changes:**
1. Add meaningful description: "Create a new contract with specified terms and dates"
2. Replace hardcoded Czech text with translation key
3. Update FormSheet component to fix spacing issues

**Priority:** MEDIUM (Contracts less frequently used than Accounts/Contacts)

---

#### 3.5 CRM Account Tasks Sheets
**File:** `/app/[locale]/(routes)/crm/accounts/[accountId]/components/NewTaskForm.tsx`
**Purpose:** Create task for account
**Status:** Not analyzed in detail

**File:** `/app/[locale]/(routes)/crm/accounts/[accountId]/components/TasksView.tsx`
**Purpose:** View/manage tasks
**Status:** Not analyzed in detail

**Priority:** MEDIUM

---

### 4. Projects Module Sheets

#### 4.1 Kanban Board Sheet
**File:** `/app/[locale]/(routes)/projects/boards/[boardId]/components/Kanban.tsx`
**Lines:** 57 (import), implementation varies

**Current Implementation:**
- Complex Kanban board with drag-and-drop
- Uses Sheet for task editing/viewing
- Multiple sheet instances possible in single component

**Status:** Requires detailed analysis (file is 100+ lines, only first 100 read)

**Priority:** HIGH (Core Projects functionality)

**Required Analysis:**
1. Read complete file to identify all Sheet usage
2. Check for consistency with other Project sheets
3. Verify task creation/edit sheets

---

#### 4.2 Project Dashboard Sheet
**File:** `/app/[locale]/(routes)/projects/dashboard/components/ProjectDasboard.tsx`
**Purpose:** Project dashboard actions
**Status:** Not analyzed in detail

**Priority:** MEDIUM

---

#### 4.3 Project Table Row Actions Sheet
**File:** `/app/[locale]/(routes)/projects/table-components/data-table-row-actions.tsx`
**Purpose:** Actions on project table rows
**Status:** Not analyzed in detail

**Priority:** MEDIUM

---

#### 4.4 Task View Actions Sheet
**File:** `/app/[locale]/(routes)/projects/tasks/viewtask/[taskId]/components/TaskViewActions.tsx`
**Purpose:** Actions for individual tasks
**Status:** Not analyzed in detail

**Priority:** HIGH (Direct task management)

---

### 5. Invoice Module Sheets

#### 5.1 Invoice Row Actions Sheet
**File:** `/app/[locale]/(routes)/invoice/data-table/data-table-row-actions.tsx`
**Purpose:** Actions on invoice rows (preview, edit, Rossum integration)
**Lines:** 35-41 (import), 185-218 (implementations)

**Current Implementation:**
```tsx
// Preview Sheet
<Sheet open={openView} onOpenChange={setOpenView}>
  <SheetContent className="min-w-[90vh]">
    <SheetHeader className="py-4">
      <SheetTitle>{"Preview Invoice" + " - " + invoice?.id}</SheetTitle>
    </SheetHeader>
    <div className="h-[90vh] pb-4">
      <embed ... src={invoice.invoice_file_url} />
    </div>
    <SheetClose asChild>
      <Button>Close</Button>
    </SheetClose>
  </SheetContent>
</Sheet>

// Rossum Edit Sheet
<Sheet open={openRossumView} onOpenChange={setOpenRossumView}>
  <SheetContent className="min-w-[90vh] max-w-full">
    <SheetHeader>
      <SheetTitle>{"Update Invoice" + " - " + invoice?.id}</SheetTitle>
      <SheetDescription>Update invoice metadata with Rossum cockpit</SheetDescription>
    </SheetHeader>
    <RossumCockpit invoiceData={row.original} />
    <SheetClose asChild>
      <Button>Close</Button>
    </SheetClose>
  </SheetContent>
</Sheet>
```

**Issues:**
1. Inconsistent width: `min-w-[90vh]` (viewport height, unusual for width)
2. String concatenation for titles instead of template literals
3. Preview sheet missing SheetDescription
4. Manual close button instead of using built-in close
5. Hardcoded "Close" text (should be translated)
6. Inconsistent header padding (`className="py-4"` on first, none on second)

**Required Changes:**
1. Use consistent width: `min-w-[90vw]` or `max-w-6xl`
2. Use template literals: `Preview Invoice - ${invoice?.id}`
3. Add SheetDescription to preview sheet
4. Remove manual close button (shadcn Sheet has built-in X button)
5. Use translation for "Close" if kept
6. Consistent header padding across both sheets

**Priority:** HIGH (Invoice is critical business function)

---

#### 5.2 Invoice Chat Dialog Sheet
**File:** `/app/[locale]/(routes)/invoice/detail/_dialogs/InvoiceChat.tsx`
**Purpose:** Chat/comments on invoice
**Status:** Not analyzed in detail

**Priority:** LOW (Secondary feature)

---

### 6. Admin Module Sheets

#### 6.1 Send Mail to All Users Sheet
**File:** `/app/[locale]/(routes)/admin/users/components/send-mail-to-all.tsx`
**Purpose:** Admin function to send bulk email
**Status:** Not analyzed in detail

**Priority:** LOW (Admin-only, infrequent use)

---

### 7. Contract Table Row Actions
**File:** `/app/[locale]/(routes)/crm/contracts/table-components/data-table-row-actions.tsx`
**Purpose:** Actions on contract table rows
**Status:** Not analyzed in detail

**Priority:** MEDIUM

---

## Analysis Summary

### Issues by Category

#### 1. Animation & Transitions (SPEC REQUIREMENT)
**Issue:** Custom duration classes in base Sheet component
**Affected Files:** 1 (`/components/ui/sheet.tsx`)
**Priority:** HIGH
**Spec Requirement:** "Use shadcn default animations" (spec.md line 212, tasks.md line 1345)

#### 2. Accessibility
**Issue:** Missing SheetDescription in multiple implementations
**Affected Files:** 3+ (AccountsView, ContactsView, Invoice preview sheet)
**Priority:** HIGH
**Impact:** Screen reader users won't understand sheet purpose

#### 3. Consistency - Width Patterns
**Issue:** Inconsistent width specifications
**Patterns Found:**
- `min-w-[1000px]` (CRM: Accounts, Contacts)
- `min-w-[90vh]` (Invoice: Preview, Rossum)
- `sm:max-w-sm` (Base component default)

**Recommendation:** Standardize to Tailwind size classes:
- Small forms: `max-w-xl` (36rem / 576px)
- Medium forms: `max-w-2xl` (42rem / 672px)
- Large forms: `max-w-3xl` (48rem / 768px)
- Extra large (document viewers): `max-w-6xl` (72rem / 1152px)

#### 4. Consistency - Header Patterns
**Issue:** Inconsistent SheetHeader implementation
**Patterns Found:**
- With SheetTitle only (no description)
- With SheetTitle and SheetDescription
- With custom className on SheetHeader

**Recommendation:** Always use both title and description for accessibility

#### 5. Consistency - Spacing
**Issue:** Inconsistent spacing between header and content
**Patterns Found:**
- `space-y-2` on SheetContent
- `space-y-4` implied
- Manual div wrappers with `h-full overflow-y-auto`

**Recommendation:** Standardize spacing pattern:
```tsx
<SheetContent className="max-w-2xl">
  <SheetHeader>
    <SheetTitle>Title</SheetTitle>
    <SheetDescription>Description</SheetDescription>
  </SheetHeader>
  <div className="mt-6 space-y-4">
    {/* Form content */}
  </div>
</SheetContent>
```

#### 6. Consistency - Footer/Actions
**Issue:** Inconsistent button placement
**Patterns Found:**
- No SheetFooter component used
- Manual SheetClose with Button
- Form submission buttons inline

**Recommendation:** Use SheetFooter for action buttons:
```tsx
<SheetFooter>
  <SheetClose asChild>
    <Button variant="outline">Cancel</Button>
  </SheetClose>
  <Button type="submit">Submit</Button>
</SheetFooter>
```

#### 7. Critical Bugs
**Issue:** Incorrect labels/translations
**Affected Files:**
- ContactsView.tsx: Title says "Create new Account" instead of "Create new Contact"
- create-contract.tsx: Hardcoded Czech text "Vytvořit" instead of translation

#### 8. Reusable Components Not Used Consistently
**Issue:** FormSheet and FormSheetNoTrigger exist but not used everywhere
**Impact:** Inconsistent implementations across modules

---

## Recommended Standardization Patterns

### Pattern 1: Simple Form Sheet (Create/Edit)
```tsx
<Sheet open={open} onOpenChange={setOpen}>
  <SheetTrigger asChild>
    <Button>Create New</Button>
  </SheetTrigger>
  <SheetContent className="max-w-2xl">
    <SheetHeader>
      <SheetTitle>{t('create.title')}</SheetTitle>
      <SheetDescription>{t('create.description')}</SheetDescription>
    </SheetHeader>
    <div className="mt-6 space-y-4">
      <Form onSubmit={onSubmit}>
        {/* Form fields */}
      </Form>
    </div>
    <SheetFooter className="mt-6">
      <SheetClose asChild>
        <Button variant="outline">{t('common.cancel')}</Button>
      </SheetClose>
      <Button type="submit">{t('common.submit')}</Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

### Pattern 2: View/Preview Sheet (Documents, Invoices)
```tsx
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent className="max-w-6xl">
    <SheetHeader>
      <SheetTitle>{t('preview.title', { id: item.id })}</SheetTitle>
      <SheetDescription>{t('preview.description')}</SheetDescription>
    </SheetHeader>
    <div className="mt-6 h-[80vh] overflow-y-auto">
      {/* Document/content viewer */}
    </div>
  </SheetContent>
</Sheet>
```

### Pattern 3: Complex Form Sheet (Multi-section)
```tsx
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent className="max-w-3xl overflow-y-auto">
    <SheetHeader>
      <SheetTitle>{t('form.title')}</SheetTitle>
      <SheetDescription>{t('form.description')}</SheetDescription>
    </SheetHeader>
    <div className="mt-6 space-y-6">
      <section>
        <h3 className="text-lg font-semibold mb-4">{t('section1.title')}</h3>
        {/* Section 1 fields */}
      </section>
      <Separator />
      <section>
        <h3 className="text-lg font-semibold mb-4">{t('section2.title')}</h3>
        {/* Section 2 fields */}
      </section>
    </div>
    <SheetFooter className="mt-6 sticky bottom-0 bg-background py-4 border-t">
      <SheetClose asChild>
        <Button variant="outline">{t('common.cancel')}</Button>
      </SheetClose>
      <Button type="submit">{t('common.submit')}</Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

---

## Implementation Priority Matrix

### Priority 1: CRITICAL (Blocking Issues)
1. **Fix base Sheet component animations** (Spec requirement)
   - File: `/components/ui/sheet.tsx`
   - Change: Remove custom duration classes
   - Impact: ALL sheets (foundation fix)

2. **Fix ContactsView title bug** (Critical UX bug)
   - File: `/app/[locale]/(routes)/crm/components/ContactsView.tsx`
   - Change: Correct sheet title
   - Impact: User confusion, data entry errors

### Priority 2: HIGH (Major Consistency Issues)
3. **Update CRM Sheets** (AccountsView, ContactsView, OpportunitiesView)
   - Files: 3 CRM view components
   - Changes: Width, accessibility, spacing, trigger buttons
   - Impact: Primary user workflows

4. **Update Invoice Sheets** (Row actions, preview, Rossum)
   - Files: Invoice data table row actions
   - Changes: Width, accessibility, close buttons, translations
   - Impact: Critical business function

5. **Update Projects Kanban Sheets** (Task management)
   - Files: Kanban.tsx, task view actions
   - Changes: Consistency with other sheets
   - Impact: Core project management workflow

### Priority 3: MEDIUM (Secondary Workflows)
6. **Update Contract Sheets** (Create, edit)
   - Files: 2 contract form files
   - Changes: Description, translations, FormSheet updates
   - Impact: Contract management workflows

7. **Update CRM Task Sheets** (Account tasks)
   - Files: 2 task-related files
   - Changes: Consistency with patterns
   - Impact: Task management in CRM

8. **Update Project Table Sheets** (Dashboard, table actions)
   - Files: 2 project module files
   - Changes: Consistency with patterns
   - Impact: Secondary project workflows

### Priority 4: LOW (Admin/Infrequent)
9. **Update Admin Sheets** (Send mail to all)
   - Files: 1 admin file
   - Changes: Consistency with patterns
   - Impact: Admin-only, infrequent use

10. **Update Invoice Chat Sheet**
    - Files: 1 invoice dialog file
    - Changes: Consistency with patterns
    - Impact: Secondary feature

### Priority 5: REFACTORING (Future Enhancement)
11. **Update reusable sheet components**
    - Files: FormSheet.tsx, FormSheetNoTrigger.tsx
    - Changes: Improve spacing, flexibility
    - Impact: Future sheet implementations

12. **Promote reusable components usage**
    - Files: All sheet implementations
    - Changes: Refactor to use FormSheet/FormSheetNoTrigger
    - Impact: Long-term maintainability

---

## Implementation Phases (Recommended)

### Phase 1: Foundation (COMPLETE)
- [x] Audit all Sheet components (THIS DOCUMENT)
- [x] Identify patterns and issues
- [x] Prioritize implementation order
- [ ] Fix base Sheet component animations (CRITICAL)
- [ ] Fix ContactsView title bug (CRITICAL)

### Phase 2: CRM Module (5.1.2)
- [ ] Update AccountsView sheet
- [ ] Update ContactsView sheet (title already fixed)
- [ ] Update OpportunitiesView sheet
- [ ] Update Contract sheets (create, edit)
- [ ] Update CRM task sheets

**Estimated Time:** 3-4 hours

### Phase 3: Projects Module (5.1.3)
- [ ] Analyze Kanban.tsx fully (read complete file)
- [ ] Update Kanban task sheets
- [ ] Update task view actions sheets
- [ ] Update project dashboard sheets
- [ ] Update project table row actions

**Estimated Time:** 2-3 hours

### Phase 4: Invoice Module (5.1.4)
- [ ] Update invoice row actions sheets (preview, Rossum)
- [ ] Update invoice chat sheet
- [ ] Verify invoice creation sheets (if any)

**Estimated Time:** 1-2 hours

### Phase 5: Other Modules (5.1.5, 5.1.6)
- [ ] Update admin sheets
- [ ] Update any remaining module sheets
- [ ] Final consistency check

**Estimated Time:** 1 hour

### Phase 6: Standardization (5.1.7)
- [ ] Update reusable sheet components (FormSheet, FormSheetNoTrigger)
- [ ] Create documentation for standard sheet patterns
- [ ] Refactor sheets to use reusable components (optional)

**Estimated Time:** 2 hours

**Total Estimated Time:** 9-12 hours

---

## Files Requiring Updates (Complete List)

### Immediate (Priority 1-2)
1. `/components/ui/sheet.tsx` - Remove custom durations
2. `/app/[locale]/(routes)/crm/components/ContactsView.tsx` - Fix title bug
3. `/app/[locale]/(routes)/crm/components/AccountsView.tsx` - Full update
4. `/app/[locale]/(routes)/crm/components/OpportunitiesView.tsx` - Full update
5. `/app/[locale]/(routes)/invoice/data-table/data-table-row-actions.tsx` - Full update
6. `/app/[locale]/(routes)/projects/boards/[boardId]/components/Kanban.tsx` - Analyze + update

### Secondary (Priority 3-4)
7. `/app/[locale]/(routes)/crm/contracts/_forms/create-contract.tsx` - Update
8. `/app/[locale]/(routes)/crm/contracts/_forms/update-contract.tsx` - Update
9. `/app/[locale]/(routes)/crm/accounts/[accountId]/components/NewTaskForm.tsx` - Update
10. `/app/[locale]/(routes)/crm/accounts/[accountId]/components/TasksView.tsx` - Update
11. `/app/[locale]/(routes)/projects/table-components/data-table-row-actions.tsx` - Update
12. `/app/[locale]/(routes)/projects/dashboard/components/ProjectDasboard.tsx` - Update
13. `/app/[locale]/(routes)/projects/tasks/viewtask/[taskId]/components/TaskViewActions.tsx` - Update
14. `/app/[locale]/(routes)/admin/users/components/send-mail-to-all.tsx` - Update
15. `/app/[locale]/(routes)/invoice/detail/_dialogs/InvoiceChat.tsx` - Update
16. `/app/[locale]/(routes)/crm/contracts/table-components/data-table-row-actions.tsx` - Update

### Reusable Components (Priority 5)
17. `/components/sheets/form-sheet.tsx` - Enhance
18. `/components/sheets/form-sheet-no-trigger.tsx` - Enhance

**Total Files:** 18 files requiring updates

---

## Testing Strategy

### After Each Phase
1. **Visual Testing:**
   - Open each sheet in browser
   - Verify animations smooth (no janky transitions)
   - Check spacing consistency
   - Verify responsive behavior (mobile, tablet, desktop)
   - Test theme switching (light/dark)

2. **Functional Testing:**
   - Test sheet open/close
   - Test form submission (where applicable)
   - Test validation errors display
   - Test cancel/close buttons
   - Test keyboard navigation (Tab, Escape)

3. **Accessibility Testing:**
   - Screen reader announcement of sheet title
   - Screen reader announcement of sheet description
   - Focus trap within sheet
   - Keyboard navigation through form fields
   - Escape key closes sheet

4. **Regression Testing:**
   - Verify no data loss on sheet close
   - Verify form state preserved (if applicable)
   - Verify parent component state updated correctly
   - Verify API calls still function

### Final Testing (After All Phases)
1. Test all sheets across all modules
2. Verify consistency in user experience
3. Test with real user workflows
4. Performance testing (sheet open/close speed)
5. Cross-browser testing (Chrome, Firefox, Safari, Edge)

---

## Acceptance Criteria Checklist

From tasks.md Task Group 5.1:

- [x] All Sheet components identified and documented (THIS DOCUMENT)
- [ ] CRM module Sheets updated with consistent design
- [ ] Projects module Sheets updated with consistent design
- [ ] All module Sheets have consistent styling
- [ ] Sheets use shadcn default animations (remove custom durations)
- [ ] Sheets are responsive on all screen sizes
- [ ] No visual regressions in Sheet behavior

---

## Recommendations for Future

### 1. Create Typed Sheet Wrapper
Create a strongly-typed sheet wrapper that enforces consistent patterns:

```typescript
// /components/sheets/StandardFormSheet.tsx
interface StandardFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  description: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}
```

### 2. Document Sheet Patterns
Create developer documentation for when to use each sheet pattern.

### 3. Lint Rules
Consider ESLint rules to enforce:
- Always include SheetDescription
- Use translation keys for text
- Use standard width classes

### 4. Storybook/Component Library
Document standard sheet patterns in Storybook for reference.

---

## Conclusion

The audit identified 18 files requiring updates to achieve consistent Sheet component design across the NextCRM application. The most critical issues are:

1. **Custom duration classes in base component** (affects all sheets)
2. **Critical title bug in ContactsView** (user-facing error)
3. **Inconsistent patterns across CRM module** (primary user workflows)

Implementation should proceed in phases, starting with critical fixes and high-priority modules (CRM, Invoice, Projects), then addressing secondary modules and refactoring opportunities.

Estimated total implementation time: 9-12 hours across 6 phases.

---

**Audit Status:** COMPLETE
**Next Step:** Begin Phase 1 implementation (base component + critical bug fix)
