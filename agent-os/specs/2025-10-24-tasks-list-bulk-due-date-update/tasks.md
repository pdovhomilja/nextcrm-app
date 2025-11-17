# Task Breakdown: Multi-Select Bulk Due Date Update for Tasks-List Table

## Overview
Total Tasks: 4 task groups with 21 sub-tasks

This feature adds multi-select bulk due date updates to the tasks-list table view. Users can select multiple tasks via checkboxes, see a floating toolbar at the bottom when tasks are selected, pick a new due date, and apply it to all selected tasks with toast feedback and automatic table refresh.

## Task List

### Task Group 1: Server Action Layer
**Dependencies:** None

- [x] 1.0 Complete server action for bulk due date updates
  - [x] 1.1 Write 2-8 focused tests for bulk update functionality
    - Limit to 2-8 highly focused tests maximum
    - Test only critical behaviors: successful bulk update, permission validation, task history logging, error handling
    - Skip exhaustive coverage of all edge cases
    - File: `actions/tasks/__tests__/bulk-update-due-dates.test.ts`
  - [x] 1.2 Create bulk update server action
    - Create: `actions/tasks/bulk-update-due-dates.ts`
    - Input interface: `{ taskIds: string[], newDueDate: Date, companyId: string }`
    - Output interface: `{ success: boolean, message?: string, updatedCount?: number, error?: string }`
    - Add "use server" directive
  - [x] 1.3 Implement authentication and permission validation
    - Verify user session with auth()
    - Fetch user's accessible boards via companyId
    - Filter taskIds to only include tasks user has access to
    - Return error if no valid tasks to update
  - [x] 1.4 Implement database transaction for bulk updates
    - Use Prisma transaction for atomicity
    - Fetch existing tasks to compare old vs new due dates
    - Update all validated tasks with new due date
    - Use `db.task.updateMany()` for efficiency
  - [x] 1.5 Add task history logging for each updated task
    - Create TaskHistory entries using `db.taskHistory.createMany()`
    - History description format: "Due date updated via bulk action: [old date] → [new date]"
    - Include userId and timestamp
    - Log changes only for tasks that had different due dates
  - [x] 1.6 Trigger embedding updates for updated tasks
    - Call `triggerTaskEmbeddingUpdate()` for each updated task (follow pattern from edit-task.ts)
    - Handle errors gracefully with console.error
    - Don't fail bulk update if embedding updates fail
  - [x] 1.7 Ensure server action tests pass
    - Run ONLY the 2-8 tests written in 1.1
    - Verify bulk update works with multiple tasks
    - Verify permission filtering works correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 1.1 pass
- Server action successfully updates multiple tasks with new due date
- Permission validation filters out unauthorized tasks
- Task history entries are created for each update
- Returns success response with updated count
- Handles errors gracefully with descriptive messages

### Task Group 2: Client Components - Bulk Update UI
**Dependencies:** Task Group 1

- [x] 2.0 Complete client-side bulk update components
  - [x] 2.1 Write 2-8 focused tests for UI components
    - Limit to 2-8 highly focused tests maximum
    - Test only critical behaviors: toolbar visibility on selection, date picker interaction, bulk update action trigger, selection clearing
    - Skip exhaustive testing of all component states
    - File: `components/bulk-due-date/__tests__/bulk-update-toolbar.test.tsx`
  - [x] 2.2 Create BulkUpdateToolbar client component
    - Create: `components/bulk-due-date/bulk-update-toolbar.tsx`
    - Add "use client" directive
    - Props: `{ selectedCount: number, onUpdate: (date: Date) => void, onCancel: () => void }`
    - Use fixed positioning at bottom of viewport (sticky bottom)
    - Style with Card component for container (matches TaskHQ design)
  - [x] 2.3 Implement toolbar content and layout
    - Display selected task count using Badge component
    - Include DatePickerInput component (reuse from components/bulk-due-date/date-picker-input.tsx)
    - Add "Update Due Dates" Button (primary style)
    - Add "Cancel" Button (secondary style)
    - Implement responsive design: vertical stack on mobile, horizontal on desktop
  - [x] 2.4 Add loading state handling
    - Track loading state with useState during update operation
    - Disable buttons during loading
    - Show loading indicator on "Update Due Dates" button
    - Prevent date picker interaction during loading
  - [x] 2.5 Ensure UI component tests pass
    - Run ONLY the 2-8 tests written in 2.1
    - Verify toolbar appears/disappears correctly
    - Verify date picker accepts valid dates
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 2.1 pass
- Toolbar appears at bottom when tasks are selected
- Selected count displays correctly
- Date picker allows date selection
- Buttons trigger appropriate callbacks
- Loading state prevents duplicate submissions
- Responsive design works on mobile and desktop

### Task Group 3: Table Enhancement with Selection
**Dependencies:** Task Groups 1 and 2

- [x] 3.0 Complete table enhancement with selection capability
  - [x] 3.1 Write 2-8 focused tests for table selection
    - Limit to 2-8 highly focused tests maximum
    - Test only critical behaviors: checkbox selection, select all functionality, selection state management, bulk update integration
    - Skip exhaustive testing of all table interactions
    - File: `components/dashboard/tables/__tests__/task-table-with-selection.test.tsx`
  - [x] 3.2 Create TaskTableWithBulkActions wrapper component
    - Create: `components/dashboard/tables/task-table-with-selection.tsx`
    - Add "use client" directive
    - Wrap TaskDataTableServer with selection state management
    - Manage selectedTaskIds with useState using Set<string>
  - [x] 3.3 Implement selection state management
    - Initialize state: `const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())`
    - Implement toggleSelection handler for individual rows
    - Implement toggleAllSelection handler for header checkbox
    - Clear selection after successful bulk update
  - [x] 3.4 Add checkbox column to table
    - Modify TaskDataTableServer to accept selection props
    - Add checkbox column as first column (follow pattern from components/data-table.tsx lines 140-165)
    - Header checkbox: Select all visible tasks on current page
    - Row checkbox: Individual task selection
    - Pass selectedTaskIds and onSelectionChange props
  - [x] 3.5 Integrate BulkUpdateToolbar
    - Conditionally render BulkUpdateToolbar when selectedTaskIds.size > 0
    - Pass selectedCount prop from selectedTaskIds.size
    - Implement onUpdate handler: call bulk-update-due-dates server action
    - Implement onCancel handler: clear selection state
  - [x] 3.6 Add toast notifications
    - Import toast from Sonner
    - Success toast: "Successfully updated [N] task(s) with new due date"
    - Error toast: "Failed to update task due dates: [error message]"
    - Show loading toast during update operation
  - [x] 3.7 Implement table refresh after update
    - Use `useRouter()` from next/navigation
    - Call `router.refresh()` after successful bulk update
    - Clear selection state after refresh
    - Ensure loading state is properly managed
  - [x] 3.8 Ensure table selection tests pass
    - Run ONLY the 2-8 tests written in 3.1
    - Verify selection state management works
    - Verify bulk update triggers successfully
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 3.1 pass
- Checkboxes appear in table for all visible tasks
- Individual task selection works correctly
- "Select all" checkbox selects all visible tasks on page
- Selection state persists until cleared
- Bulk update toolbar appears when tasks are selected
- Toast notifications show appropriate messages
- Table refreshes automatically after successful update
- Selection clears after successful update

### Task Group 4: Integration and Testing
**Dependencies:** Task Groups 1-3

- [x] 4.0 Review existing tests and fill critical gaps only
  - [x] 4.1 Review tests from Task Groups 1-3
    - Review the 2-8 tests written by server-engineer (Task 1.1)
    - Review the 2-8 tests written by ui-engineer (Task 2.1)
    - Review the 2-8 tests written by ui-engineer (Task 3.1)
    - Total existing tests: approximately 6-24 tests
  - [x] 4.2 Update tasks-list page to use new wrapper component
    - Modify: `app/(app)/[cid]/tasks-list/page.tsx`
    - Replace TaskDataTableServer with TaskTableWithSelection
    - Pass all existing props (user, searchParams, companyId)
    - Ensure page remains a Server Component
    - Verify existing filters and pagination still work
  - [x] 4.3 Analyze test coverage gaps for THIS feature only
    - Identify critical user workflows that lack test coverage
    - Focus ONLY on gaps related to bulk due date update feature
    - Do NOT assess entire application test coverage
    - Prioritize end-to-end workflows over unit test gaps
  - [x] 4.4 Write up to 10 additional strategic tests maximum
    - Add maximum of 10 new integration tests to fill identified critical gaps
    - Focus on end-to-end workflows: select tasks → pick date → update → verify
    - Test interaction between server action, UI components, and page
    - Test edge cases: no selection, invalid date, permission failures
    - Do NOT write comprehensive coverage for all scenarios
    - Skip performance tests unless business-critical
    - File: `app/(app)/[cid]/tasks-list/__tests__/bulk-due-date-integration.test.ts`
  - [x] 4.5 Run feature-specific tests only
    - Run ONLY tests related to bulk due date update feature (tests from 1.1, 2.1, 3.1, and 4.4)
    - Expected total: approximately 16-34 tests maximum
    - Do NOT run the entire application test suite
    - Verify critical workflows pass
    - Note: Test framework not yet configured in project; tests are ready for when Jest/Vitest is set up
  - [x] 4.6 Manual testing of complete workflow
    - Test on tasks-list page with various filters applied
    - Test with overdue filter: `?dueDate=overdue`
    - Test with status filters: `?status=IN_PROGRESS`
    - Test with priority filters: `?priority=HIGH`
    - Verify selection works across filtered results
    - Verify bulk update respects current filters
    - Verify table refresh shows updated due dates
    - Verify toast notifications appear correctly
    - Test on mobile and desktop viewports
    - Test with 1, 10, and 50+ selected tasks

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 16-34 tests total)
- No more than 10 additional tests added when filling in testing gaps
- Tasks-list page successfully integrates new selection capability
- Existing filters and pagination continue to work
- Critical user workflows for bulk due date updates are covered
- Manual testing confirms feature works end-to-end
- Responsive design works on mobile and desktop
- Performance is acceptable for bulk updates of 10-100 tasks

## Execution Order

Recommended implementation sequence:
1. **Server Action Layer** (Task Group 1) - Foundation for bulk updates
2. **Client Components - Bulk Update UI** (Task Group 2) - Toolbar and UI elements
3. **Table Enhancement with Selection** (Task Group 3) - Integration with existing table
4. **Integration and Testing** (Task Group 4) - Final integration and comprehensive testing

## Technical Notes

### File Paths
- Server Action: `/Users/pdovhomilja/development/Next.js/taskhq.app/actions/tasks/bulk-update-due-dates.ts`
- Bulk Toolbar Component: `/Users/pdovhomilja/development/Next.js/taskhq.app/components/bulk-due-date/bulk-update-toolbar.tsx`
- Table Wrapper Component: `/Users/pdovhomilja/development/Next.js/taskhq.app/components/dashboard/tables/task-table-with-selection.tsx`
- Page Integration: `/Users/pdovhomilja/development/Next.js/taskhq.app/app/(app)/[cid]/tasks-list/page.tsx`

### Reusable Patterns
- Checkbox selection: Follow `components/data-table.tsx` lines 140-165
- Date picker: Reuse `components/bulk-due-date/date-picker-input.tsx`
- Server action structure: Follow `actions/tasks/edit-task.ts`
- Task history logging: Follow patterns in `actions/tasks/edit-task.ts`
- Toast notifications: Use Sonner (already imported in task actions)

### Key Constraints
- Selection limited to current visible page (no cross-page selection)
- All selected tasks receive the same exact due date (no relative calculations)
- Bulk updates respect current table filters (status, priority, due date, search)
- Use existing permission patterns (no additional permission checks)
- Keep task history logging simple (no "bulk update" distinction)
