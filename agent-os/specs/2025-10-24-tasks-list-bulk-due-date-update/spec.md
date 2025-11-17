# Specification: Multi-Select Bulk Due Date Update for Tasks-List Table

## Goal

Enable users to select multiple tasks from the tasks-list table view and update their due dates in bulk using a single date picker, streamlining task management for users who need to reschedule multiple tasks to the same due date.

## User Stories

- As a project manager, I want to select multiple overdue tasks and update their due dates to today so that I can quickly bring tasks back on schedule
- As a team lead, I want to bulk update due dates for all tasks filtered by priority so that critical tasks can be rescheduled efficiently
- As a user viewing overdue tasks (using the `dueDate=overdue` filter), I want to select multiple tasks and assign them a new due date so that I can reorganize my workload
- As a user, I want to see immediate feedback when bulk updates succeed or fail so that I know the operation completed correctly
- As a user, I want the table to refresh automatically after bulk updates so that I can see the updated due dates without manual refresh

## Core Requirements

- Users can select individual tasks via checkboxes in each table row
- Users can select/deselect all visible tasks on the current page via a header checkbox
- When tasks are selected, a floating toolbar appears at the bottom of the table
- The floating toolbar displays the count of selected tasks
- The floating toolbar contains a date picker for selecting the new due date
- The floating toolbar contains an "Update Due Dates" button
- All selected tasks receive the exact same due date (no relative date calculations)
- Bulk updates respect current table filters (status, priority, due date, search)
- Selection state is cleared after successful bulk update
- Table automatically refreshes to display updated due dates after bulk update
- Toast notifications provide success/error feedback using Sonner
- Existing task permissions and access controls are enforced

## Visual Design

No mockups provided - follow existing TaskHQ design patterns:
- Use shadcn/ui Checkbox component (already present in `components/data-table.tsx`)
- Floating toolbar uses fixed positioning at bottom of viewport
- Toolbar styling matches existing TaskHQ UI (Card or similar container)
- Date picker uses existing `DatePickerInput` component from `components/bulk-due-date/date-picker-input.tsx`
- Responsive design: toolbar stacks vertically on mobile, horizontal on desktop

## Reusable Components

### Existing Code to Leverage

**Components:**
- `components/ui/checkbox.tsx` - Radix UI checkbox component for selection
- `components/ui/calendar.tsx` - React Day Picker calendar component
- `components/bulk-due-date/date-picker-input.tsx` - Date picker with validation and formatting
- `components/data-table.tsx` - Example of checkbox selection pattern (lines 140-165)
- `components/ui/button.tsx` - Buttons for actions
- `components/ui/badge.tsx` - Display selected count
- Sonner toast system for notifications (already imported in task actions)

**Server Actions:**
- `actions/tasks/edit-task.ts` - Pattern for task update operations and task history logging
- `actions/tasks/update-active-tasks-due-date.ts` - Example bulk update pattern (uses relative dates, but architecture is reusable)
- `actions/dashboard/get-task-table-data.ts` - Current task data fetching with filters

**UI Patterns:**
- `components/dashboard/tables/task-data-table-server.tsx` - Current table implementation (lines 258-391)
- `components/dashboard/tables/task-table-filters.tsx` - Filter and pagination patterns
- `app/(app)/[cid]/tasks-list/search-params.ts` - URL state management with nuqs

### New Components Required

**Client Component: Bulk Update Toolbar**
- Floating toolbar at bottom of viewport
- Displays selected task count with Badge
- Contains DatePickerInput for date selection
- Contains "Update Due Dates" and "Cancel" buttons
- Only visible when tasks are selected
- Must be a client component to manage selection state

**Client Component: Enhanced Table with Selection**
- Wraps existing `TaskTable` component
- Adds checkbox column to table
- Manages selection state (selected task IDs)
- Renders Bulk Update Toolbar when selection exists
- Integrates with existing server component data flow

**Server Action: Bulk Update Due Dates (Simple)**
- New action: `actions/tasks/bulk-update-due-dates.ts`
- Updates multiple tasks with the same exact due date
- Different from existing `update-active-tasks-due-date.ts` which uses relative date calculations
- Creates task history entries for each updated task
- Returns success/error response with updated count

## Technical Approach

### Architecture Pattern

Follow Next.js 15 App Router pattern with Server Components + Client Components:
- `TaskDataTableServer` remains a Server Component (data fetching)
- Create new Client Component `TaskTableWithBulkActions` that wraps the table
- Selection state managed in client component with React useState
- Bulk update triggered via server action from client component
- Use `router.refresh()` after successful update to trigger data refetch

### Selection State Management

Use React state in client component:
```typescript
const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
```

Track selected task IDs in a Set for efficient lookup. Clear the Set after successful bulk update.

### Integration with Existing Table

Modify `TaskTable` component to accept selection props:
- Add `selectedTaskIds` prop
- Add `onSelectionChange` prop
- Add checkbox column as first column (after drag handle if present)
- Pass selection state from parent client component

### Server Action Specification

Create `actions/tasks/bulk-update-due-dates.ts`:
```typescript
Input: {
  taskIds: string[]
  newDueDate: Date
  companyId: string
}

Output: {
  success: boolean
  message?: string
  updatedCount?: number
  error?: string
}
```

Validation:
- Verify user authentication
- Verify user has access to each task's board
- Validate newDueDate is a valid date
- Filter out any tasks user doesn't have permission to modify

Database Operations:
- Use Prisma transaction for atomicity
- Update all tasks with new due date
- Create TaskHistory entries for audit trail
- History description: "Due date updated via bulk action: [old date] → [new date]"

### Date Picker Integration

Reuse existing `DatePickerInput` component from `components/bulk-due-date/date-picker-input.tsx`:
- Simple mode (no reference date or date difference display)
- Standard date validation
- Accessible calendar picker with dropdown

### Toast Notifications

Use Sonner toast with clear messages:
- Success: "Successfully updated [N] task(s) with new due date"
- Error: "Failed to update task due dates: [error message]"
- Loading state: Show loading indicator on button during update

### Filter Integration

Bulk update respects current filters:
- User filters to `dueDate=overdue`
- User selects multiple overdue tasks
- Only selected tasks are updated (not all overdue tasks)
- Selection is based on visible task IDs, not filter criteria

## Out of Scope

- Relative date calculations ("+7 days from today" style updates)
- Confirmation dialogs before applying updates (use toast notifications only)
- Additional permission checks beyond existing task/board access patterns
- Distinguishing "bulk update" vs individual updates in task history (simple logging)
- Bulk updates for other task properties (status, priority, assignments, etc.)
- Cross-page selection (selection limited to current visible page only)
- "Select All" across all pages with filters applied
- Export functionality or other bulk operations beyond due date updates
- Bulk update preview showing which tasks will be affected
- Undo functionality for bulk updates

## Success Criteria

- Users can successfully select multiple tasks using checkboxes on the tasks-list page
- Floating toolbar appears immediately when any task is selected
- Selected task count badge displays correct count
- Date picker allows users to select a valid future date
- Clicking "Update Due Dates" successfully updates all selected tasks
- Toast notification confirms successful update with task count
- Table automatically refreshes showing updated due dates
- Selection is automatically cleared after successful update
- Bulk update operation respects current table filters (status, priority, due date, search)
- Error handling provides clear feedback if update fails
- Task history entries are created for each updated task
- Existing task permissions and access controls are enforced
- Feature works correctly on desktop and mobile viewports
- Performance is acceptable for bulk updates of 10-100 tasks

